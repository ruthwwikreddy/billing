import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const PORT = 3000;

// Database setup
let db: Database.Database;
try {
  db = new Database("billing.db");
  console.log("Database connected successfully.");
} catch (error) {
  console.error("Failed to connect to database:", error);
  process.exit(1);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    customerName TEXT NOT NULL,
    amount REAL NOT NULL,
    payeeName TEXT NOT NULL,
    payeeVpa TEXT NOT NULL,
    status TEXT DEFAULT 'unpaid',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    productOrService TEXT
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    category TEXT DEFAULT 'General',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recurring_invoices (
    id TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    amount REAL NOT NULL,
    payeeName TEXT NOT NULL,
    payeeVpa TEXT NOT NULL,
    productOrService TEXT,
    frequency TEXT NOT NULL, -- 'weekly', 'monthly'
    nextRunDate DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES clients(id)
  );
`);

// Clear existing data to start fresh as requested
// db.exec("DELETE FROM invoices");

app.use(cors());
app.use(bodyParser.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

// API Routes
console.log("Registering API routes...");

// Clients API
app.get("/api/clients", (req, res) => {
  const clients = db.prepare("SELECT * FROM clients ORDER BY name ASC").all();
  res.json(clients);
});

app.post("/api/clients", (req, res) => {
  const { id, name, email, category } = req.body;
  try {
    const stmt = db.prepare("INSERT INTO clients (id, name, email, category) VALUES (?, ?, ?, ?)");
    stmt.run(id, name, email, category);
    res.status(201).json({ message: "Client created" });
  } catch (error) {
    res.status(400).json({ error: "Client ID already exists" });
  }
});

app.delete("/api/clients/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  res.json({ message: "Client deleted" });
});

// Recurring Invoices API
app.get("/api/recurring-invoices", (req, res) => {
  const recurring = db.prepare(`
    SELECT r.*, c.name as customerName 
    FROM recurring_invoices r 
    JOIN clients c ON r.clientId = c.id 
    ORDER BY r.createdAt DESC
  `).all();
  res.json(recurring);
});

app.post("/api/recurring-invoices", (req, res) => {
  const { id, clientId, amount, payeeName, payeeVpa, productOrService, frequency, nextRunDate } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO recurring_invoices (id, clientId, amount, payeeName, payeeVpa, productOrService, frequency, nextRunDate) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, clientId, amount, payeeName, payeeVpa, productOrService, frequency, nextRunDate);
    res.status(201).json({ message: "Recurring invoice set up" });
  } catch (error) {
    res.status(400).json({ error: "Failed to set up recurring invoice" });
  }
});

app.delete("/api/recurring-invoices/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM recurring_invoices WHERE id = ?").run(id);
  res.json({ message: "Recurring invoice deleted" });
});

// Helper to process recurring invoices
function processRecurringInvoices() {
  const now = new Date().toISOString();
  const due = db.prepare("SELECT * FROM recurring_invoices WHERE nextRunDate <= ?").all() as any[];
  
  for (const r of due) {
    const client = db.prepare("SELECT name FROM clients WHERE id = ?").get(r.clientId) as { name: string };
    const invoiceId = `REC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Create the invoice
    db.prepare(`
      INSERT INTO invoices (id, customerName, amount, payeeName, payeeVpa, productOrService) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(invoiceId, client.name, r.amount, r.payeeName, r.payeeVpa, r.productOrService);
    
    // Update next run date
    const nextDate = new Date(r.nextRunDate);
    if (r.frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (r.frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    db.prepare("UPDATE recurring_invoices SET nextRunDate = ? WHERE id = ?").run(nextDate.toISOString(), r.id);
    console.log(`Generated recurring invoice ${invoiceId} for ${client.name}`);
  }
}

// Run every hour
setInterval(processRecurringInvoices, 1000 * 60 * 60);
// Also run on start
processRecurringInvoices();

app.get("/api/invoices", (req, res) => {
  console.log("GET /api/invoices");
  const invoices = db.prepare("SELECT * FROM invoices ORDER BY createdAt DESC").all();
  res.json(invoices);
});

app.get("/api/stats", (req, res) => {
  console.log("GET /api/stats");
  const totalInvoices = db.prepare("SELECT COUNT(*) as count FROM invoices").get() as { count: number };
  const paidInvoices = db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status = 'paid'").get() as { count: number };
  const unpaidInvoices = db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status = 'unpaid'").get() as { count: number };
  const totalAmount = db.prepare("SELECT SUM(amount) as sum FROM invoices").get() as { sum: number | null };
  const paidAmount = db.prepare("SELECT SUM(amount) as sum FROM invoices WHERE status = 'paid'").get() as { sum: number | null };
  const unpaidAmount = db.prepare("SELECT SUM(amount) as sum FROM invoices WHERE status = 'unpaid'").get() as { sum: number | null };

  res.json({
    totalCount: totalInvoices.count,
    paidCount: paidInvoices.count,
    unpaidCount: unpaidInvoices.count,
    totalAmount: totalAmount.sum || 0,
    paidAmount: paidAmount.sum || 0,
    unpaidAmount: unpaidAmount.sum || 0,
  });
});

app.post("/api/invoices", (req, res) => {
  const { id, customerName, amount, payeeName, payeeVpa, productOrService } = req.body;
  console.log("Creating invoice:", { id, customerName, amount, payeeName, payeeVpa, productOrService });
  try {
    const stmt = db.prepare(
      "INSERT INTO invoices (id, customerName, amount, payeeName, payeeVpa, productOrService) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, customerName, amount, payeeName, payeeVpa, productOrService);
    res.status(201).json({ message: "Invoice created successfully" });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(400).json({ error: "Invoice ID already exists or invalid data" });
  }
});

app.patch("/api/invoices/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const stmt = db.prepare("UPDATE invoices SET status = ? WHERE id = ?");
  const result = stmt.run(status, id);
  if (result.changes > 0) {
    res.json({ message: "Status updated" });
  } else {
    res.status(404).json({ error: "Invoice not found" });
  }
});

app.delete("/api/invoices/:id", (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare("DELETE FROM invoices WHERE id = ?");
  const result = stmt.run(id);
  if (result.changes > 0) {
    res.json({ message: "Invoice deleted" });
  } else {
    res.status(404).json({ error: "Invoice not found" });
  }
});

app.post("/api/invoices/bulk-delete", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Invalid IDs" });
  }
  const placeholders = ids.map(() => "?").join(",");
  const stmt = db.prepare(`DELETE FROM invoices WHERE id IN (${placeholders})`);
  stmt.run(...ids);
  res.json({ message: `${ids.length} invoices deleted` });
});

app.post("/api/invoices/bulk-status", (req, res) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Invalid IDs" });
  }
  const placeholders = ids.map(() => "?").join(",");
  const stmt = db.prepare(`UPDATE invoices SET status = ? WHERE id IN (${placeholders})`);
  stmt.run(status, ...ids);
  res.json({ message: `Status updated for ${ids.length} invoices` });
});

async function startServer() {
  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);
  app.use("/api/*", (req, res) => {
    console.log(`API 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "API route not found" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
