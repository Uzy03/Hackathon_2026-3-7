import base64,json,os,subprocess,threading,time,urllib.request,urllib.error,http.cookiejar
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
root=Path(__file__).resolve().parents[1]
original_tsconfig=(root/'frontend/tsconfig.json').read_text()
seen=[]
class Mock(BaseHTTPRequestHandler):
 def log_message(self,*args): pass
 def respond(self,status,data):
  self.send_response(status);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(data).encode())
 def do_POST(self):
  body=self.rfile.read(int(self.headers.get('Content-Length',0)))
  seen.append((self.path,self.headers.get('Authorization') is not None))
  if self.path.startswith('/auth/v1/token'):
   enc=lambda x:base64.urlsafe_b64encode(json.dumps(x).encode()).decode().rstrip('=')
   token=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':'test-user','exp':int(time.time())+3600})+'.test-signature'
   self.respond(200,{'access_token':token,'refresh_token':'local-test-refresh','token_type':'bearer','expires_in':3600,'user':{'id':'test-user','email':'test@example.test','app_metadata':{'role':'admin'},'user_metadata':{},'aud':'authenticated','created_at':'2026-01-01T00:00:00Z'}})
  else:self.respond(200,{'ok':True})
 def do_GET(self):
  seen.append((self.path,self.headers.get('Authorization') is not None))
  if self.path.startswith('/api/me'):self.respond(200,{'id':'test-user','isAdmin':True})
  elif '/redirect/' in self.path:
   self.send_response(302);self.send_header('Location','https://example.invalid/');self.end_headers()
  else:self.respond(200,[])
server=ThreadingHTTPServer(('127.0.0.1',18743),Mock)
threading.Thread(target=server.serve_forever,daemon=True).start()
jar=http.cookiejar.CookieJar();opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
origin='http://127.0.0.1:18742'
import tempfile
log=tempfile.TemporaryFile(mode='w+')
env={**os.environ,'APP_ENABLED':'true','BACKEND_URL':'http://127.0.0.1:18743','SUPABASE_URL':'http://127.0.0.1:18743','SUPABASE_ANON_KEY':'local-test-publishable','NEXT_DIST_DIR':'.next-proxy-test'}
process=subprocess.Popen([str(root/'frontend/node_modules/.bin/next'),'dev','--hostname','127.0.0.1','--port','18742'],cwd=root/'frontend',env=env,stdout=log,stderr=log)
def request(path,method='GET',data=None,source=None):
 headers={}
 if source:headers['Origin']=source
 if data is not None:headers['Content-Type']='application/json'
 raw=data.encode() if isinstance(data,str) else json.dumps(data).encode() if data is not None else None
 req=urllib.request.Request(origin+path,data=raw,headers=headers,method=method)
 try:r=opener.open(req,timeout=30)
 except urllib.error.HTTPError as error:r=error
 payload=r.read();return r.status,r.headers,payload
checks=0
try:
 for _ in range(100):
  try:
   if request('/auth/session')[0]==401:break
  except (urllib.error.URLError,TimeoutError):time.sleep(.2)
 else:raise AssertionError('Local Next server did not start')
 assert not seen;checks+=1
 assert request('/backend-api/customers')[0]==401;checks+=1
 assert request('/api/customers')[0]==401;checks+=1
 assert request('/auth/login','POST',{'email':'test@example.test','password':'local-test'},'https://other.test')[0]==403;checks+=1
 status,headers,payload=request('/auth/login','POST',{'email':'test@example.test','password':'local-test'},origin)
 assert status==200, (status, json.loads(payload).get('detail'))
 assert b'access_token' not in payload
 assert 'HttpOnly' in headers.get('Set-Cookie','') and 'SameSite=lax' in headers.get('Set-Cookie','');checks+=1
 assert request('/auth/session')[0]==200;checks+=1
 status,headers,payload=request('/backend-api/customers');assert status==200 and headers['Cache-Control']=='no-store';checks+=1
 assert request('/backend-api/convert','POST',{'message':'hello'},'https://other.test')[0]==403;checks+=1
 assert request('/backend-api/convert','POST',{'message':'hello'},origin)[0]==200;checks+=1
 assert request('/backend-api/convert','POST','x'*16385,origin)[0]==413;checks+=1
 assert request('/backend-api/unrecognized')[0]==404;checks+=1
 assert request('/backend-api/customers/redirect/messages')[0]==502;checks+=1
 assert request('/auth/logout','POST',{},'https://other.test')[0]==403;checks+=1
 assert request('/auth/logout','POST',{},origin)[0]==200;checks+=1
 assert request('/auth/session')[0]==401;checks+=1
 result={'proxy_checks_passed':checks,'external_cloud_requests':0,'authentication_and_data_provider':'local mock only'}
 print(json.dumps(result))
finally:
 process.terminate()
 try:process.wait(timeout=10)
 except subprocess.TimeoutExpired:process.kill()
 server.shutdown();log.close()
 (root/'frontend/tsconfig.json').write_text(original_tsconfig)
