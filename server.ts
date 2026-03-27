import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const PORT = 3000;

// Database setup
const db = new Database("billing.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    customerName TEXT NOT NULL,
    amount REAL NOT NULL,
    payeeName TEXT NOT NULL,
    payeeVpa TEXT NOT NULL,
    status TEXT DEFAULT 'unpaid',
    location TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Clear existing data to start fresh as requested
db.exec("DELETE FROM invoices");

app.use(cors());
app.use(bodyParser.json());

// API Routes
app.get("/api/invoices", (req, res) => {
  const invoices = db.prepare("SELECT * FROM invoices ORDER BY createdAt DESC").all();
  res.json(invoices);
});

app.get("/api/stats", (req, res) => {
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
  const { id, customerName, amount, payeeName, payeeVpa, location } = req.body;
  try {
    const stmt = db.prepare(
      "INSERT INTO invoices (id, customerName, amount, payeeName, payeeVpa, location) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, customerName, amount, payeeName, payeeVpa, location);
    res.status(201).json({ message: "Invoice created successfully" });
  } catch (error) {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
