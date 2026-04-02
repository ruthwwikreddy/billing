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
    productOrService TEXT,
    currency TEXT DEFAULT 'INR'
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
    currency TEXT DEFAULT 'INR',
    FOREIGN KEY (clientId) REFERENCES clients(id)
  );
`);

// Migration for existing databases
try {
  db.exec("ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT 'INR'");
} catch (e) {}
try {
  db.exec("ALTER TABLE recurring_invoices ADD COLUMN currency TEXT DEFAULT 'INR'");
} catch (e) {}

// Clear existing data to start fresh as requested
// db.exec("DELETE FROM invoices");

app.use(cors());
app.use(bodyParser.json());

const apiRouter = express.Router();

apiRouter.use((req, res, next) => {
  console.log(`API Request: ${req.method} ${req.originalUrl}`);
  next();
});

// Clients API
apiRouter.get("/clients", (req, res) => {
  const clients = db.prepare("SELECT * FROM clients ORDER BY name ASC").all();
  res.json(clients);
});

apiRouter.post("/clients", (req, res) => {
  const { id, name, email, category } = req.body;
  try {
    const stmt = db.prepare("INSERT INTO clients (id, name, email, category) VALUES (?, ?, ?, ?)");
    stmt.run(id, name, email, category);
    res.status(201).json({ message: "Client created" });
  } catch (error) {
    res.status(400).json({ error: "Client ID already exists" });
  }
});

apiRouter.delete("/clients/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  res.json({ message: "Client deleted" });
});

// Recurring Invoices API
apiRouter.get("/recurring-invoices", (req, res) => {
  const recurring = db.prepare(`
    SELECT r.*, c.name as customerName 
    FROM recurring_invoices r 
    JOIN clients c ON r.clientId = c.id 
    ORDER BY r.createdAt DESC
  `).all();
  res.json(recurring);
});

apiRouter.post("/recurring-invoices", (req, res) => {
  const { id, clientId, amount, payeeName, payeeVpa, productOrService, frequency, nextRunDate, currency } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO recurring_invoices (id, clientId, amount, payeeName, payeeVpa, productOrService, frequency, nextRunDate, currency) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, clientId, amount, payeeName, payeeVpa, productOrService, frequency, nextRunDate, currency || 'INR');
    res.status(201).json({ message: "Recurring invoice set up" });
  } catch (error) {
    res.status(400).json({ error: "Failed to set up recurring invoice" });
  }
});

apiRouter.delete("/recurring-invoices/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM recurring_invoices WHERE id = ?").run(id);
  res.json({ message: "Recurring invoice deleted" });
});

apiRouter.get("/invoices", (req, res) => {
  const invoices = db.prepare("SELECT * FROM invoices ORDER BY createdAt DESC").all();
  res.json(invoices);
});

apiRouter.get("/stats", (req, res) => {
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

apiRouter.post("/invoices", (req, res) => {
  const { id, customerName, amount, payeeName, payeeVpa, productOrService, currency } = req.body;
  try {
    const stmt = db.prepare(
      "INSERT INTO invoices (id, customerName, amount, payeeName, payeeVpa, productOrService, currency) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, customerName, amount, payeeName, payeeVpa, productOrService, currency || 'INR');
    res.status(201).json({ message: "Invoice created successfully" });
  } catch (error) {
    res.status(400).json({ error: "Invoice ID already exists or invalid data" });
  }
});

apiRouter.patch("/invoices/:id/status", (req, res) => {
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

apiRouter.delete("/invoices/:id", (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare("DELETE FROM invoices WHERE id = ?");
  const result = stmt.run(id);
  if (result.changes > 0) {
    res.json({ message: "Invoice deleted" });
  } else {
    res.status(404).json({ error: "Invoice not found" });
  }
});

apiRouter.post("/invoices/bulk-delete", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Invalid IDs" });
  }
  const placeholders = ids.map(() => "?").join(",");
  const stmt = db.prepare(`DELETE FROM invoices WHERE id IN (${placeholders})`);
  stmt.run(...ids);
  res.json({ message: `${ids.length} invoices deleted` });
});

apiRouter.post("/invoices/bulk-status", (req, res) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Invalid IDs" });
  }
  const placeholders = ids.map(() => "?").join(",");
  const stmt = db.prepare(`UPDATE invoices SET status = ? WHERE id IN (${placeholders})`);
  stmt.run(status, ...ids);
  res.json({ message: `Status updated for ${ids.length} invoices` });
});

// Helper to process recurring invoices
function processRecurringInvoices() {
  const now = new Date().toISOString();
  const due = db.prepare("SELECT * FROM recurring_invoices WHERE nextRunDate <= ?").all(now) as any[];
  
  for (const r of due) {
    const client = db.prepare("SELECT name FROM clients WHERE id = ?").get(r.clientId) as { name: string };
    const invoiceId = `REC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    db.prepare(`
      INSERT INTO invoices (id, customerName, amount, payeeName, payeeVpa, productOrService, currency) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(invoiceId, client.name, r.amount, r.payeeName, r.payeeVpa, r.productOrService, r.currency || 'INR');
    
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

// Seeding logic
const clientsCount = db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number };
if (clientsCount.count === 0) {
  console.log("Seeding initial data...");
  const clientId1 = Math.random().toString(36).substring(2, 10).toUpperCase();
  const clientId2 = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  db.prepare("INSERT INTO clients (id, name, email, category) VALUES (?, ?, ?, ?)").run(clientId1, "Acme Corp", "billing@acme.com", "Enterprise");
  db.prepare("INSERT INTO clients (id, name, email, category) VALUES (?, ?, ?, ?)").run(clientId2, "Stark Industries", "tony@stark.com", "Tech");
  
  db.prepare(`
    INSERT INTO invoices (id, customerName, amount, payeeName, payeeVpa, productOrService, currency, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("INV-001", "Acme Corp", 1500.00, DEFAULT_PAYEE_NAME, DEFAULT_PAYEE_VPA, "Cloud Infrastructure", "INR", "paid");
  
  db.prepare(`
    INSERT INTO invoices (id, customerName, amount, payeeName, payeeVpa, productOrService, currency, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("INV-002", "Stark Industries", 5000.00, DEFAULT_PAYEE_NAME, DEFAULT_PAYEE_VPA, "Arc Reactor Maintenance", "USD", "unpaid");
}

app.use("/api", apiRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

async function startServer() {
  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);
  
  // API 404 handler
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
