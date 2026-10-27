import json
from pathlib import Path
from datetime import datetime, timezone
from graphify.detect import save_manifest
from graphify.cli import _stamped_manifest_files
root=Path('graphify-out'); detect=json.loads((root/'.graphify_detect.json').read_text(encoding='utf-8')); extraction=json.loads((root/'.graphify_extract.json').read_text(encoding='utf-8'))
corpus=detect.get('all_files') or detect['files']; manifest_files=_stamped_manifest_files(corpus,extraction,Path('.')); semantic_types=('document','paper','image'); dispatched={f for t,files in detect['files'].items() if t in semantic_types for f in files}; stamped={f for files in manifest_files.values() for f in files}; cleared=dispatched-stamped; scan={f for files in corpus.values() for f in files}
save_manifest(manifest_files,root='.',scan_corpus=scan,clear_semantic=cleared or None)
cost_path=root/'cost.json'; cost=json.loads(cost_path.read_text(encoding='utf-8')) if cost_path.exists() else {'runs':[],'total_input_tokens':0,'total_output_tokens':0}
tin=extraction.get('input_tokens',0); tout=extraction.get('output_tokens',0); cost['runs'].append({'date':datetime.now(timezone.utc).isoformat(),'input_tokens':tin,'output_tokens':tout,'files':detect.get('total_files',0)}); cost['total_input_tokens']+=tin; cost['total_output_tokens']+=tout; cost_path.write_text(json.dumps(cost,indent=2,ensure_ascii=False),encoding='utf-8')
print(f'Manifest saved. This run: {tin} input / {tout} output tokens; cumulative runs: {len(cost["runs"])}.')
