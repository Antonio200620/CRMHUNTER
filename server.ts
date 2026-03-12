import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey!) 
  : null;

if (supabase) {
  const maskedUrl = supabaseUrl?.replace(/(https:\/\/)(.*)(\.supabase\.co)/, "$1***$3");
  console.log(`Supabase initialized with URL: ${maskedUrl}`);
  if (!supabaseServiceKey) {
    console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY is missing. Admin features (like user registration) may not work.");
  }
} else {
  console.log("Supabase not configured. Falling back to SQLite.");
}

const db = new Database("crm.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    "order" INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    segment TEXT,
    location TEXT,
    size TEXT,
    cnpj TEXT,
    stage_id INTEGER,
    priority TEXT DEFAULT 'Medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_interaction DATETIME,
    FOREIGN KEY (stage_id) REFERENCES stages(id)
  );

  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    type TEXT, -- 'call', 'email', 'whatsapp', 'meeting', 'note'
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    title TEXT,
    due_date DATETIME,
    completed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS import_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    lead_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS saved_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    config TEXT, -- JSON string of report configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quick_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT NOT NULL,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Initialize default settings
const defaultSettings = [
  { key: 'company_name', value: 'Minha Empresa CRM' },
  { key: 'currency', value: 'BRL' }
];

for (const setting of defaultSettings) {
  try {
    db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(setting.key, setting.value);
  } catch (e) {}
}

// Add batch_id to leads if not exists
try {
  db.prepare("ALTER TABLE leads ADD COLUMN batch_id INTEGER REFERENCES import_batches(id)").run();
} catch (e) {}

// Add value to leads if not exists
try {
  db.prepare("ALTER TABLE leads ADD COLUMN value REAL DEFAULT 0").run();
} catch (e) {}

// Seed stages if empty or different
const currentStages = db.prepare("SELECT name FROM stages ORDER BY \"order\"").all() as { name: string }[];
const newStages = [
  "Lead", "1° mensagem", "1° ligação", "2° mensagem", "2° ligação", 
  "Material preparatório D.I", "Diagnóstico", "Proposta", "Follow up", "Fechamento", "Indicação"
];

if (currentStages.length !== newStages.length) {
  db.prepare("DELETE FROM stages").run();
  const insertStage = db.prepare("INSERT INTO stages (name, color, \"order\") VALUES (?, ?, ?)");
  const colors = ["#94a3b8", "#60a5fa", "#3b82f6", "#818cf8", "#6366f1", "#a855f7", "#ec4899", "#fbbf24", "#f97316", "#10b981", "#06b6d4"];
  newStages.forEach((name, i) => {
    insertStage.run(name, colors[i % colors.length], i + 1);
  });
}

// Seed default user if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)")
    .run("admin@hunterai.com", "admin123", "Admin Hunter", "admin");
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    
    if (supabase) {
      if (!supabaseServiceKey) {
        return res.status(400).json({ error: "O registro de novos usuários requer a chave SUPABASE_SERVICE_ROLE_KEY configurada nos Secrets." });
      }
      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });
        
        if (authError) return res.status(400).json({ error: authError.message });
        
        // Create profile
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          email,
          name,
          role: 'user'
        });
        
        if (profileError) return res.status(500).json({ error: profileError.message });
        
        return res.json({ success: true, message: "Usuário registrado com sucesso" });
      } catch (err) {
        return res.status(500).json({ error: "Erro ao registrar usuário" });
      }
    }
    
    // SQLite fallback
    try {
      db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)")
        .run(email, password, name, 'user');
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? "E-mail já cadastrado" : "Erro ao registrar" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error("Login error:", error.message);
          let userMessage = error.message;
          if (userMessage.includes("Email not confirmed")) {
            userMessage = "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou as configurações do Supabase.";
          }
          return res.status(401).json({ error: userMessage });
        }
        
        // Get profile info
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        // If profile doesn't exist (e.g. user created manually in dashboard), create it
        if (profileError || !profile) {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              email: data.user.email,
              name: data.user.email?.split('@')[0] || 'Usuário',
              role: 'user'
            })
            .select()
            .single();
          
          if (!createError) {
            profile = newProfile;
          }
        }
          
        return res.json({ 
          user: {
            id: data.user.id,
            email: data.user.email,
            name: profile?.name || data.user.email?.split('@')[0] || 'Usuário',
            role: profile?.role || 'user'
          }, 
          token: data.session?.access_token 
        });
      } catch (err: any) {
        console.error("Internal login error:", err);
        return res.status(500).json({ error: "Erro interno no servidor de autenticação: " + err.message });
      }
    }

    const user = db.prepare("SELECT id, email, name, role FROM users WHERE email = ? AND password = ?")
      .get(email, password) as any;
    
    if (user) {
      res.json({ user, token: "mock-jwt-token-" + user.id });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (supabase) {
      // For simplicity in this demo, we'll return the first profile if no session is active
      // In a real app, we'd verify the JWT from headers.
      const { data: profiles } = await supabase.from('profiles').select('*').limit(1);
      if (profiles && profiles.length > 0) {
        const p = profiles[0];
        return res.json({ 
          user: {
            id: p.id,
            email: p.email,
            name: p.name,
            role: p.role
          } 
        });
      }
    }
    const user = db.prepare("SELECT id, email, name, role FROM users LIMIT 1").get();
    res.json({ user });
  });

  app.patch("/api/auth/profile", async (req, res) => {
    const { name } = req.body;
    // In a real app, we'd get the user ID from the session/token
    // For this demo, we'll use the first user or a mock ID
    if (supabase) {
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      if (profiles && profiles.length > 0) {
        const userId = profiles[0].id;
        const { data, error } = await supabase
          .from('profiles')
          .update({ name })
          .eq('id', userId)
          .select()
          .single();
        
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ user: data });
      }
    }
    
    const user = db.prepare("SELECT id FROM users LIMIT 1").get() as any;
    if (user) {
      db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, user.id);
      const updated = db.prepare("SELECT id, email, name, role FROM users WHERE id = ?").get(user.id);
      return res.json({ user: updated });
    }
    res.status(404).json({ error: "Usuário não encontrado" });
  });

  // API Routes
  app.get("/api/stages", async (req, res) => {
    if (supabase) {
      const { data, error } = await supabase.from('stages').select('*').order('order');
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    const stages = db.prepare("SELECT * FROM stages ORDER BY \"order\"").all();
    res.json(stages);
  });

  app.post("/api/stages", async (req, res) => {
    const { name, color, order } = req.body;
    if (supabase) {
      const { data, error } = await supabase.from('stages').insert({
        name,
        color: color || "#94a3b8",
        order: order || 1
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ id: data.id });
    }
    const info = db.prepare("INSERT INTO stages (name, color, \"order\") VALUES (?, ?, ?)")
      .run(name, color || "#94a3b8", order || 1);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/stages/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    if (supabase) {
      const { error } = await supabase.from('stages').update(updates).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    const fields = Object.keys(updates).map(k => {
      if (k === 'order') return `"order" = ?`;
      return `${k} = ?`;
    }).join(", ");
    const values = Object.values(updates);
    db.prepare(`UPDATE stages SET ${fields} WHERE id = ?`).run(...values, id);
    res.json({ success: true });
  });

  app.delete("/api/stages/:id", async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      // Check if there are leads in this stage
      const { count, error: countError } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('stage_id', id);
      if (countError) return res.status(500).json({ error: countError.message });
      if (count && count > 0) {
        return res.status(400).json({ error: "Não é possível excluir um estágio que possui leads." });
      }
      const { error } = await supabase.from('stages').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    // Check if there are leads in this stage
    const leadsInStage = db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage_id = ?").get(id) as { count: number };
    if (leadsInStage.count > 0) {
      return res.status(400).json({ error: "Não é possível excluir um estágio que possui leads." });
    }
    db.prepare("DELETE FROM stages WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/leads", async (req, res) => {
    if (supabase) {
      const { data, error } = await supabase
        .from('leads')
        .select('*, stage:stages(name)')
        .order('updated_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const formatted = data.map(l => ({ ...l, stage_name: (l as any).stage?.name }));
      return res.json(formatted);
    }
    const leads = db.prepare(`
      SELECT l.*, s.name as stage_name 
      FROM leads l 
      LEFT JOIN stages s ON l.stage_id = s.id
      ORDER BY l.updated_at DESC
    `).all();
    res.json(leads);
  });

  app.post("/api/leads", async (req, res) => {
    const { name, company, email, phone, website, segment, location, size, cnpj, stage_id, comment, batch_id, value } = req.body;
    
    if (supabase) {
      const { data, error } = await supabase.from('leads').insert({
        name, company, email, phone, website, segment, location, size, cnpj, 
        stage_id: stage_id || null, 
        batch_id: batch_id || null, 
        value: value || 0
      }).select().single();
      
      if (error) return res.status(500).json({ error: error.message });
      
      if (comment && comment.trim()) {
        await supabase.from('interactions').insert({
          lead_id: data.id,
          type: 'note',
          content: comment
        });
      }
      
      return res.json({ id: data.id });
    }

    const info = db.prepare(`
      INSERT INTO leads (name, company, email, phone, website, segment, location, size, cnpj, stage_id, batch_id, value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, company, email, phone, website, segment, location, size, cnpj, stage_id || 1, batch_id || null, value || 0);
    
    const leadId = info.lastInsertRowid;

    if (comment && comment.trim()) {
      db.prepare("INSERT INTO interactions (lead_id, type, content) VALUES (?, ?, ?)")
        .run(leadId, 'note', comment);
    }

    res.json({ id: leadId });
  });

  app.patch("/api/leads/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    if (supabase) {
      const { error } = await supabase.from('leads').update(updates).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    const values = Object.values(updates);
    db.prepare(`UPDATE leads SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
    res.json({ success: true });
  });

  app.delete("/api/leads/:id", async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    db.prepare("DELETE FROM interactions WHERE lead_id = ?").run(id);
    db.prepare("DELETE FROM tasks WHERE lead_id = ?").run(id);
    db.prepare("DELETE FROM leads WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Import Batches Routes
  app.get("/api/import-batches", async (req, res) => {
    if (supabase) {
      const { data, error } = await supabase.from('import_batches').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    const batches = db.prepare("SELECT * FROM import_batches ORDER BY created_at DESC").all();
    res.json(batches);
  });

  app.post("/api/import-batches", async (req, res) => {
    const { filename, lead_count } = req.body;
    if (supabase) {
      const { data, error } = await supabase.from('import_batches').insert({ filename, lead_count }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ id: data.id });
    }
    const info = db.prepare("INSERT INTO import_batches (filename, lead_count) VALUES (?, ?)")
      .run(filename, lead_count);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/import-batches/:id", async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase.from('import_batches').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    // Delete all leads in this batch
    db.prepare("DELETE FROM interactions WHERE lead_id IN (SELECT id FROM leads WHERE batch_id = ?)").run(id);
    db.prepare("DELETE FROM tasks WHERE lead_id IN (SELECT id FROM leads WHERE batch_id = ?)").run(id);
    db.prepare("DELETE FROM leads WHERE batch_id = ?").run(id);
    db.prepare("DELETE FROM import_batches WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Settings Routes
  app.get("/api/settings", async (req, res) => {
    if (supabase) {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) return res.status(500).json({ error: error.message });
      const settingsObj = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      return res.json(settingsObj);
    }
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", async (req, res) => {
    const settings = req.body;
    if (supabase) {
      const upserts = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
      const { error } = await supabase.from('settings').upsert(upserts);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    const transaction = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        stmt.run(key, String(value));
      }
    });
    transaction(settings);
    res.json({ success: true });
  });

  // Saved Reports Routes
  app.get("/api/saved-reports", async (req, res) => {
    if (supabase) {
      const { data, error } = await supabase.from('saved_reports').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    const reports = db.prepare("SELECT * FROM saved_reports ORDER BY created_at DESC").all();
    res.json(reports);
  });

  app.post("/api/saved-reports", async (req, res) => {
    const { name, description, config } = req.body;
    if (supabase) {
      const { data, error } = await supabase.from('saved_reports').insert({ name, description, config }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ id: data.id });
    }
    const info = db.prepare("INSERT INTO saved_reports (name, description, config) VALUES (?, ?, ?)")
      .run(name, description, JSON.stringify(config));
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/saved-reports/:id", async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase.from('saved_reports').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    db.prepare("DELETE FROM saved_reports WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Quick Commands Routes
  app.get("/api/quick-commands", async (req, res) => {
    if (supabase) {
      const { data, error } = await supabase.from('quick_commands').select('*').order('created_at', { ascending: false }).limit(20);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    const commands = db.prepare("SELECT * FROM quick_commands ORDER BY created_at DESC LIMIT 20").all();
    res.json(commands);
  });

  app.post("/api/quick-commands", async (req, res) => {
    const { command, result } = req.body;
    if (supabase) {
      const { data, error } = await supabase.from('quick_commands').insert({ command, result }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ id: data.id });
    }
    const info = db.prepare("INSERT INTO quick_commands (command, result) VALUES (?, ?)")
      .run(command, result);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/quick-commands/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM quick_commands WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.patch("/api/leads/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    const values = Object.values(updates);
    db.prepare(`UPDATE leads SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
    res.json({ success: true });
  });

  app.delete("/api/leads/:id", async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    db.prepare("DELETE FROM interactions WHERE lead_id = ?").run(id);
    db.prepare("DELETE FROM tasks WHERE lead_id = ?").run(id);
    db.prepare("DELETE FROM leads WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/interactions/:id", async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { data, error } = await supabase.from('interactions').select('*').eq('id', id).single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    const interaction = db.prepare("SELECT * FROM interactions WHERE id = ?").get(id);
    res.json(interaction);
  });

  app.patch("/api/interactions/:id", async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    if (supabase) {
      const { error } = await supabase.from('interactions').update({ content }).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    db.prepare("UPDATE interactions SET content = ? WHERE id = ?").run(content, id);
    res.json({ success: true });
  });

  app.delete("/api/interactions/:id", async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase.from('interactions').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    db.prepare("DELETE FROM interactions WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/leads/:id/interactions", async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { data, error } = await supabase.from('interactions').select('*').eq('lead_id', id).order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    const interactions = db.prepare("SELECT * FROM interactions WHERE lead_id = ? ORDER BY created_at DESC").all(id);
    res.json(interactions);
  });

  app.post("/api/leads/:id/interactions", async (req, res) => {
    const { id } = req.params;
    const { type, content } = req.body;
    if (supabase) {
      const { error } = await supabase.from('interactions').insert({ lead_id: id, type, content });
      if (error) return res.status(500).json({ error: error.message });
      await supabase.from('leads').update({ last_interaction: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
      return res.json({ success: true });
    }
    db.prepare("INSERT INTO interactions (lead_id, type, content) VALUES (?, ?, ?)").run(id, type, content);
    db.prepare("UPDATE leads SET last_interaction = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Tasks Routes
  app.get("/api/leads/:id/tasks", async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { data, error } = await supabase.from('tasks').select('*').eq('lead_id', id).order('due_date', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    const tasks = db.prepare("SELECT * FROM tasks WHERE lead_id = ? ORDER BY due_date ASC").all(id);
    res.json(tasks);
  });

  app.post("/api/leads/:id/tasks", async (req, res) => {
    const { id } = req.params;
    const { title, due_date } = req.body;
    if (supabase) {
      const { data, error } = await supabase.from('tasks').insert({ lead_id: id, title, due_date }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ id: data.id });
    }
    const info = db.prepare("INSERT INTO tasks (lead_id, title, due_date) VALUES (?, ?, ?)")
      .run(id, title, due_date);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const { id } = req.params;
    const { completed, title, due_date } = req.body;
    if (supabase) {
      const updates: any = {};
      if (completed !== undefined) updates.completed = completed;
      if (title !== undefined) updates.title = title;
      if (due_date !== undefined) updates.due_date = due_date;
      const { error } = await supabase.from('tasks').update(updates).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    const updates: string[] = [];
    const values: any[] = [];
    
    if (completed !== undefined) { updates.push("completed = ?"); values.push(completed ? 1 : 0); }
    if (title !== undefined) { updates.push("title = ?"); values.push(title); }
    if (due_date !== undefined) { updates.push("due_date = ?"); values.push(due_date); }
    
    if (updates.length > 0) {
      db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values, id);
    }
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/dashboard/stats", (req, res) => {
    const totalLeads = db.prepare("SELECT COUNT(*) as count FROM leads").get() as any;
    
    // Calculate conversion rate (leads in 'Fechamento' or 'Indicação' vs total)
    const closedLeads = db.prepare(`
      SELECT COUNT(*) as count FROM leads 
      WHERE stage_id IN (SELECT id FROM stages WHERE name IN ('Fechamento', 'Indicação'))
    `).get() as any;
    
    const conversionRate = totalLeads.count > 0 ? ((closedLeads.count / totalLeads.count) * 100).toFixed(1) : "0.0";

    // Average time in pipeline (simplified: current_time - created_at for closed leads)
    const avgTime = db.prepare(`
      SELECT AVG(julianday('now') - julianday(created_at)) as avg_days 
      FROM leads 
      WHERE stage_id IN (SELECT id FROM stages WHERE name IN ('Fechamento', 'Indicação'))
    `).get() as any;

    // Estimated revenue (mock logic: leads in advanced stages * average deal size)
    const advancedLeads = db.prepare(`
      SELECT COUNT(*) as count FROM leads 
      WHERE stage_id IN (SELECT id FROM stages WHERE name IN ('Proposta', 'Follow up', 'Fechamento'))
    `).get() as any;
    const estimatedRevenue = (advancedLeads.count * 15000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const stageDistribution = db.prepare(`
      SELECT s.name, COUNT(l.id) as count 
      FROM stages s 
      LEFT JOIN leads l ON s.id = l.stage_id 
      GROUP BY s.id
      ORDER BY s."order"
    `).all();

    const recentInteractions = db.prepare(`
      SELECT i.*, l.name as lead_name 
      FROM interactions i 
      JOIN leads l ON i.lead_id = l.id 
      ORDER BY i.created_at DESC LIMIT 5
    `).all();
    
    res.json({
      totalLeads: totalLeads.count,
      conversionRate: `${conversionRate}%`,
      avgTime: avgTime.avg_days ? `${Math.round(avgTime.avg_days)} dias` : 'N/A',
      estimatedRevenue,
      stageDistribution,
      recentInteractions
    });
  });

  app.get("/api/reports/monthly", (req, res) => {
    const monthlyProspecting = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count 
      FROM leads 
      GROUP BY month 
      ORDER BY month DESC
    `).all();

    const companyTable = db.prepare(`
      SELECT company, segment, location, created_at 
      FROM leads 
      WHERE company IS NOT NULL AND company != ''
      ORDER BY created_at DESC
    `).all();

    const segmentBreakdown = db.prepare(`
      SELECT segment as name, COUNT(*) as count 
      FROM leads 
      WHERE segment IS NOT NULL AND segment != ''
      GROUP BY segment
    `).all();

    res.json({
      monthlyProspecting,
      companyTable,
      segmentBreakdown
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
