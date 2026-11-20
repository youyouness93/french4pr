# Builds ./preview: a copy of ./site with relative links, for the private Claude preview.
import os,re,shutil
root='preview'; shutil.rmtree(root,ignore_errors=True); shutil.copytree('site',root)
for dp,_,fs in os.walk(root):
  for f in fs:
    p=os.path.join(dp,f); rel=os.path.relpath(p,root)
    if not f.endswith('.html'): continue
    pre='../'*rel.count('/') or './'
    s=open(p).read()
    def fix(m):
      path=m.group(2)[1:]
      path='index.html' if path=='' else (path+'index.html' if path.endswith('/') else path)
      return f'{m.group(1)}="{pre}{path}"'
    s=re.sub(r'(href|src)="(/(?!/)[^"]*)"',fix,s)
    s=re.sub(r'(imagesrcset|srcset)="([^"]*)"',lambda m:m.group(1)+'="'+m.group(2).replace('/assets/',pre+'assets/')+'"',s)
    s=s.replace("'/free-assessment/thank-you/'",f"'{pre}free-assessment/thank-you/index.html'")
    if rel=='index.html':
      s=re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>|</head>\s*<body>|</body>\s*</html>','',s,flags=re.I)
      s=s.replace('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n','')
      s=re.sub(r'<title>[^<]*</title>','<title>French4PR</title>',s,count=1)
    open(p,'w').write(s)
css=os.path.join(root,'assets/css/style.css'); open(css,'w').write(open(css).read().replace('url(/assets/img/key.png)','url(../img/key.png)'))
