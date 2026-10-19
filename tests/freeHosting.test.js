'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const {decodeImage}=require('../cloud/products');
const db=require('../cloud/db');
test('Render Free: variables y archivos de configuración listos',()=>{
 const blueprint=fs.readFileSync(path.join(root,'render.yaml'),'utf8');
 assert.match(blueprint,/plan: free/);
 assert.match(blueprint,/DATABASE_URL/);
 assert.match(blueprint,/healthCheckPath: \/health/);
 assert.ok(fs.existsSync(path.join(root,'package.json')));
 const p=require('../package.json');
 assert.ok(p.dependencies.pg);
});
test('Neon: archivos privados nunca expuestos por express.static',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.doesNotMatch(app,/express\.static\(\s*.*dataDir/);
 assert.match(app,/if\(production&&!cloud\)throw/);
 assert.match(app,/SELECT 1/);
 const setup=fs.readFileSync(path.join(root,'cloud/db.js'),'utf8');
 assert.match(setup,/visag_users/);
 assert.match(setup,/visag_sessions/);
 assert.match(setup,/visag_uploads/);
 assert.match(setup,/catalog_initialized/);
 assert.match(setup,/pg_advisory_xact_lock/);
});
test('Fotos: rechaza MIME falso, tamaño excesivo y acepta PNG válido',()=>{
 const onePx=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YL//yoAAAAASUVORK5CYII=','base64');
 const accepted=decodeImage('data:image/png;base64,'+onePx.toString('base64'));
 assert.equal(accepted.mime,'image/png');assert.ok(accepted.bytes.length>12);
 assert.throws(()=>decodeImage('data:image/jpeg;base64,'+onePx.toString('base64')),/no coincide/);
 assert.throws(()=>decodeImage('data:image/png;base64,'+Buffer.alloc(3*1024*1024+2).toString('base64')),/3 MB/);
});
test('Variables del comercio: datos reales deben ser configurables sin hardcode',()=>{
 const site=fs.readFileSync(path.join(root,'public/js/site.js'),'utf8');
 assert.match(site,/visag-whatsapp-number/);
 const head=fs.readFileSync(path.join(root,'views/partials/head.ejs'),'utf8');
 assert.match(head,/whatsappNumber/);
 const gitignore=fs.readFileSync(path.join(root,'.gitignore'),'utf8');
 assert.match(gitignore,/\.env/);
});
