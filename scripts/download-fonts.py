"""Download unmodified static Google Fonts subsets with Hungarian glyph coverage."""
import concurrent.futures, hashlib, io, json, pathlib, re, urllib.parse, urllib.request
from fontTools.ttLib import TTFont
ROOT=pathlib.Path(__file__).resolve().parent.parent
FAMILIES=['Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Nunito','Raleway','DM Sans','Oswald','Roboto Condensed','Playfair Display','Merriweather','Lora','EB Garamond','Cormorant Garamond','Libre Baskerville','Caveat','Dancing Script','Abril Fatface']
UPRIGHT_ONLY={'Oswald','Caveat','Dancing Script','Abril Fatface'}
chars=''.join(chr(i) for i in range(32,127))+''.join(chr(i) for i in range(160,384))+'€•…–—−×'
UA='Mozilla/5.0'
def get(url):
 return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=45).read()
def acquire(item):
 family,weight,italic=item
 slug=family.replace(' ','')
 file=f'{slug}-{weight}'+('-italic'if italic else'')+'.ttf'
 target=ROOT/'public/fonts'/file
 cache=ROOT/'test-results/font-download'/(file+'.json');cache.parent.mkdir(parents=True,exist_ok=True)
 if cache.exists()and target.exists():
  record=json.loads(cache.read_text())
  if record['sha256']==hashlib.sha256(target.read_bytes()).hexdigest():return record
 query=family+(':ital,wght@1,'+str(weight)if italic else':wght@'+str(weight))
 cssurl='https://fonts.googleapis.com/css2?family='+urllib.parse.quote(query,safe=':,@')+'&text='+urllib.parse.quote(chars)
 css=get(cssurl).decode();url=re.search(r'url\(([^)]+)',css)[1];data=get(url);font=TTFont(io.BytesIO(data))
 assert 'fvar'not in font, f'Non-static upstream font: {family}'
 assert font['OS/2'].usWeightClass==weight, f'Incorrect upstream weight: {family}'
 assert bool(font['post'].italicAngle or font['OS/2'].fsSelection & 1 or font['head'].macStyle & 2)==italic, f'Incorrect upstream style: {family}'
 if not all(ord(c) in font.getBestCmap()for c in 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ'):
  suffix=('Bold'if weight==700 else'')+('Italic'if italic else'')or'Regular'
  url=f'https://raw.githubusercontent.com/google/fonts/main/ofl/{family.lower().replace(" ","")}/{family.replace(" ","")}-{suffix}.ttf'
  data=get(url);font=TTFont(io.BytesIO(data))
  assert all(ord(c)in font.getBestCmap()for c in 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ'), family
 target.write_bytes(data)
 record={'family':family,'weight':weight,'italic':italic,'file':file,'hungarianGlyphsVerified':True,'source':url,'sha256':hashlib.sha256(data).hexdigest()}
 cache.write_text(json.dumps(record));return record
def license_for(family):
 slug=family.lower().replace(' ','')
 path=ROOT/'public/fonts'/(family.replace(' ','')+'-OFL.txt')
 if not path.exists():path.write_bytes(get(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{slug}/OFL.txt'))
 return family
if __name__=='__main__':
 existing=json.loads((ROOT/'src/data/fonts.json').read_text())
 retained=[v for v in existing if v['family']not in FAMILIES]
 tasks=[(f,w,i)for f in FAMILIES for i in ([False]if f in UPRIGHT_ONLY else[False,True])for w in ([400]if f=='Abril Fatface'else[400,700])]
 new=[];errors=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8)as pool:
  work={pool.submit(acquire,t):t for t in tasks}
  for future in concurrent.futures.as_completed(work):
   try:new.append(future.result())
   except Exception as e:errors.append((work[future],str(e)))
  list(pool.map(license_for,FAMILIES))
 if errors:print('Variant diagnostics:',json.dumps(errors,ensure_ascii=False),flush=True)
 assert all(any(r['family']==f and r['weight']==400 and not r['italic']for r in new)for f in FAMILIES),'Missing regular family'
 new.sort(key=lambda f:(FAMILIES.index(f['family']),f['italic'],f['weight']))
 (ROOT/'src/data/fonts.json').write_text(json.dumps(retained+[{k:v for k,v in f.items()if k not in ['source','sha256']}for f in new],ensure_ascii=False,indent=2))
 old=json.loads((ROOT/'public/fonts/sources.json').read_text())
 old=[r for r in old if r.get('file')in {f['file']for f in retained}]
 (ROOT/'public/fonts/sources.json').write_text(json.dumps(old+new,ensure_ascii=False,indent=2))
 print(f'{len(FAMILIES)} families, {len(new)} verified variants',flush=True)
