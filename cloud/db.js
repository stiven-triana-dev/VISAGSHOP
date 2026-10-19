'use strict';
// Neon PostgreSQL: all mutable production data resides here, not on Render's disk.
const path = require('node:path');
const fs = require('node:fs');
const enabled = Boolean(process.env.DATABASE_URL);
let pool;
function getPool(){
  if(!enabled) throw Error('DATABASE_URL no configurada.');
  if(!pool){
    const {Pool}=require('pg');
    pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:12000,idleTimeoutMillis:30000,allowExitOnIdle:true});
    pool.on('error',e=>console.error('Conexión Neon interrumpida:',e.message));
  }
  return pool;
}
const query=(sql,params=[])=>getPool().query(sql,params);
async function initialize(){
  const client=await getPool().connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(712381529)');
    await client.query(`CREATE TABLE IF NOT EXISTS visag_meta (key TEXT PRIMARY KEY, value JSONB NOT NULL)`);
    await client.query(`CREATE TABLE IF NOT EXISTS visag_products (id TEXT PRIMARY KEY, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS visag_users (id UUID PRIMARY KEY, email TEXT NOT NULL UNIQUE, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS visag_sessions (token_hash CHAR(64) PRIMARY KEY, user_id UUID NOT NULL REFERENCES visag_users(id) ON DELETE CASCADE, remember BOOLEAN NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await client.query(`CREATE INDEX IF NOT EXISTS visag_sessions_exp_idx ON visag_sessions(expires_at)`);
    await client.query(`CREATE TABLE IF NOT EXISTS visag_uploads (id UUID PRIMARY KEY, mime TEXT NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp')), image_bytes BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await client.query(`CREATE SEQUENCE IF NOT EXISTS visag_product_id_seq START WITH 1`);
    const result=await client.query("SELECT value FROM visag_meta WHERE key='catalog_initialized' FOR UPDATE");
    if(result.rowCount===0){
      const file=path.join(__dirname,'..','data','products.json');
      const rows=JSON.parse(fs.readFileSync(file,'utf8'));
      if(!Array.isArray(rows)||rows.length<1)throw Error('No se encontró el catálogo original para inicializar Neon.');
      for(const p of rows){
        if(!/^p\d{3,}$/.test(p.id))throw Error('Referencia original inválida.');
        await client.query('INSERT INTO visag_products(id,payload) VALUES($1,$2)',[p.id,JSON.stringify(p)]);
      }
      const max=Math.max(...rows.map(p=>Number(p.id.slice(1))));
      await client.query("SELECT setval('visag_product_id_seq',$1,true)",[max]);
      await client.query("INSERT INTO visag_meta(key,value) VALUES('catalog_initialized',$1)",[JSON.stringify({at:new Date().toISOString(),count:rows.length})]);
      console.info(`Neon inicializado con ${rows.length} productos; sin cuentas de cliente importadas.`);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
module.exports={enabled,query,getPool,initialize};
