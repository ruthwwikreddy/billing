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
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add sample invoice if empty
const count = db.prepare("SELECT COUNT(*) as count FROM invoices").get() as { count: number };
if (count.count === 0) {
  db.prepare(
    "INSERT INTO invoices (id, customerName, amount, payeeName, payeeVpa) VALUES (?, ?, ?, ?, ?)"
  ).run("INV-001", "Sample Customer", 100.00, "Sample Payee", "sample@upi");
}

app.use(cors());
app.use(bodyParser.json());

// API Routes
app.get("/api/invoices", (req, res) => {
  const invoices = db.prepare("SELECT * FROM invoices ORDER BY createdAt DESC").all();
  res.json(invoices);
});

app.post("/api/invoices", (req, res) => {
  const { id, customerName, amount, payeeName, payeeVpa } = req.body;
  try {
    const stmt = db.prepare(
      "INSERT INTO invoices (id, customerName, amount, payeeName, payeeVpa) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(id, customerName, amount, payeeName, payeeVpa);
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
