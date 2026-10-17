#!/usr/bin/env python3
"""Static fictional design examples. Does not implement the MCP Apps kit."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'examples'
OLD = json.loads((ROOT.parent / '2026-10-17-journey-views-design/mockups.json').read_text())
COMMITS, SCOPES, ENTRIES = OLD['commits'], OLD['catchupScopes'], OLD['catchupEntries']
E = lambda value: html.escape(str(value), quote=True)
PAGES = {}


def actor(name, kind='agent'):
    controller = '<span class="controller">controlled by Ari</span>' if kind == 'agent' else ''
    return f'<p class="actor"><span class="shape {kind}" aria-hidden="true"></span><strong>{E(name)}</strong>{controller}</p>'


def link(key, text, primary=False, act=None):
    classes = 'button primary' if primary else 'button'
    data = f' data-static-act="{E(act)}"' if act else ''
    return f'<a class="{classes}" href="{key}-THEME.html"{data}>{E(text)}</a>'


def read(key, text):
    return f'<a href="{key}-THEME.html">{E(text)}</a>'


def actions(*items):
    return '<div class="actions">' + ''.join(items) + '</div>'


def top(back, revision):
    return f'<nav class="top" aria-label="Record navigation"><a class="back" href="{back}-THEME.html">‹ Back</a><span class="version">{E(revision)}</span></nav>'


def page(key, title, content, *, mode='full', subject='', revision='', back='carousel-question', acts=(), waiting='Ari', settles='Read only', receipt=None, active_actor='Ari'):
    if mode == 'full':
        content = top(back, revision) + content
    context = {'item': subject or key, 'revision': revision, 'entryPositionsRead': [], 'waitingOn': waiting, 'settlesBy': settles}
    PAGES[key] = dict(title=title, content=content, mode=mode, subject=subject or key, revision=revision, acts=list(acts), context=context, receipt=receipt, back=back, activeActor=active_actor)


SLIDES = [
    ('question', 'Keep completed tasks in history?', 'Approve question text v2, or ask for a revision.', 'Storage agent', 'agent', 'question', 'q7', 'text v2'),
    ('change', 'Improve empty-list message', 'Review Change 18 version 2; checks passed.', 'Interface agent', 'agent', 'change-review', 'change18', 'version 2'),
    ('failed', 'Keep task history', 'Change 23 has two failed checks.', 'Storage agent', 'agent', 'change-failed', 'change23', 'version 1'),
    ('unknown', 'Keyboard focus fix', 'Check the original publication request for Change 9.', 'Ari', 'person', 'change-unknown', 'change9', 'version 1'),
    ('updates', '7 new entries', 'Three scopes have updates since your last review.', 'Ari', 'person', 'updates', 'review-cut', '240→245 · 17→18 · 8→9'),
]


def slide(index, rows=None):
    rows = SLIDES if rows is None else rows
    key, title, summary, name, kind, detail, subject, revision = rows[index]
    previous = f'<a data-previous href="carousel-{rows[index-1][0]}-THEME.html" aria-label="Previous item">‹</a>' if index else '<span aria-disabled="true" aria-label="Previous item">‹</span>'
    next_link = f'<a data-next href="carousel-{rows[index+1][0]}-THEME.html" aria-label="Next item">›</a>' if index < len(rows)-1 else '<span aria-disabled="true" aria-label="Next item">›</span>'
    return f'<section data-carousel aria-label="Items needing you">{actor(name, kind)}<a class="slide-title" href="{detail}-THEME.html">{E(title)}</a><p class="summary">{E(summary)}</p><nav class="pager" aria-label="Carousel">{previous}<span class="position" aria-live="polite">{index+1} / {len(rows)}</span>{next_link}</nav></section>'


for i, row in enumerate(SLIDES):
    key, title, summary, name, kind, detail, subject, revision = row
    page('carousel-'+key, title, slide(i), mode='inline', subject=subject, revision=revision, settles=summary)

question = actor('Storage agent') + '<h1>Keep completed tasks in history?</h1><div class="choices"><h2>Keep history</h2><p>Hide completed tasks from the active list. Keep earlier tasks recoverable.</p><h2>Delete permanently</h2><p>Remove completed tasks and their history.</p></div>'
page('question', 'Review question text', question + actions(link('receipt-question', 'Approve text v2', True, 'approve-text'), link('composer-revision', 'Request revision')), subject='q7', revision='text v2 · entry 245', acts=['approve-text-v2'], settles='Approve q7 text v2, or request revision')
page('question-approved', 'Record the decision', question + '<p class="check">✓ Text v2 approved by Ari · entry 246</p>' + actions(link('decision-recorded', 'Record decision: keep history', True, 'record-decision')), subject='q7', revision='text v2 · approval 246', acts=['record-decision-q7-v2'], settles='Record a decision on approved text v2')
page('decision-recorded', 'Decision recorded', actor('Ari', 'person') + '<h1>Keep history</h1><p>Decision on question q7 text v2 · entry 247</p><p>The current work terms still need their own revision and new offers.</p><div class="read-links">'+read('work-before-revision', 'Read current work conditions')+'</div>', subject='q7', revision='decision 247', settles='Settled decision')
page('question-stale', 'Old question instance', actor('Storage agent') + '<h1>Proposal: delete completed tasks permanently.</h1><p class="notice failed">Out of date: question text is now v2.</p><div class="actions"><span class="button" aria-disabled="true">Old text v1 cannot be approved</span></div>', subject='q7', revision='text v1 · superseded', settles='Open the current revision')
page('composer-revision', 'Revision request draft', '<h1>Request a revision</h1><p>The composer has a draft naming question q7 text v2. Edit the reason there, then send it.</p><p class="muted">Preparing a draft records no revision request.</p>', subject='q7', revision='text v2', settles='Send an edited request from the composer')

terms1 = '<p>Add Clear completed to the task list.</p><p>Hide completed tasks from the active list.</p><p>Do not change unfinished tasks.</p>'
terms2 = '<p>Keep completed tasks in history.</p><p>Hide them from the active list.</p><p>Keep earlier tasks recoverable.</p>'
page('work-before-revision', 'Revise work conditions', actor('Ari','person')+'<h1>Clear completed</h1><h2>Conditions v1 · entry 220</h2>'+terms1+'<p>Decision entry 247 calls for keeping history. Revise the conditions before making new offers.</p>'+actions(link('work-revised','Revise conditions',True,'revise-conditions')), subject='clear-completed', revision='conditions v1 · decision 247', acts=['revise-conditions'], settles='Record conditions v2 separately')
for i,(short,name) in enumerate([('interface','Interface agent'),('storage','Storage agent')]):
    summary = actor(name)+'<a class="slide-title" href="work-'+short+'-THEME.html">'+('Button and empty list' if i==0 else 'Storage and history')+'</a><p class="summary">Offer current conditions v2.</p>'
    pager = '<nav class="pager" aria-label="Work carousel">'+('<a data-previous href="carousel-interface-THEME.html" aria-label="Previous item">‹</a>' if i else '<span aria-disabled="true">‹</span>')+f'<span class="position">{i+1} / 2</span>'+('<span aria-disabled="true">›</span>' if i else '<a data-next href="carousel-storage-THEME.html" aria-label="Next item">›</a>')+'</nav>'
    page('carousel-'+short,'Offer current conditions', '<section data-carousel>'+summary+pager+'</section>',mode='inline',subject='commitment-'+short,revision='conditions v2 · entry 250',settles='Offer v2 to '+name)

for name, short, entry in [('Interface agent', 'interface', 251), ('Storage agent', 'storage', 252)]:
    page('work-'+short, 'Offer current conditions', actor(name) + '<h1>'+('Button and empty list' if short == 'interface' else 'Storage and history')+'</h1><p>Old commitment: conditions v1 · accepted.</p><h2>Current conditions v2</h2>'+terms2+actions(link('work-offered-'+short, 'Offer conditions v2', True, 'offer-v2')), back='carousel-'+short, subject='commitment-'+short, revision='conditions v2 · entry 250', acts=['offer-v2-to-'+short], settles='Make a new offer to '+name)
    page('work-offered-'+short, 'Offer recorded', actor(name)+f'<h1>Conditions v2 offered</h1><p>Ari made the new offer · entry {entry}.</p><p>The v1 commitment is still accepted. Only {E(name)} can accept this new offer.</p><div class="read-links">'+read('work-accepted', 'Read the later acceptance')+'</div>', back='carousel-'+short, subject='commitment-'+short, revision=f'offer {entry} · conditions v2', waiting=name, settles='The named offeree accepts conditions v2')
page('work-revised', 'Revised work conditions', actor('Ari', 'person')+'<h1>Clear completed</h1><h2>Conditions v2 · entry 250</h2>'+terms2+'<p class="notice">Changing these conditions did not revise either accepted v1 commitment.</p><div class="read-links">'+read('work-interface', 'Interface work')+read('work-storage', 'Storage work')+'</div>', subject='clear-completed', revision='conditions v2 · entry 250')
page('work-original-offer', 'Accept the original offer', actor('Interface agent')+'<h1>Button and empty list</h1><h2>Conditions v1 · entry 220</h2>'+terms1+'<p>Ari offered these conditions to Interface agent · entry 221.</p>'+actions(link('work-original-accepted', 'Accept conditions v1', True, 'accept-v1')), subject='commitment-interface', revision='offer 221 · conditions v1', waiting='Interface agent', acts=['accept-v1-as-interface'], settles='Interface agent accepts its offer', active_actor='Interface agent')
page('work-original-accepted', 'Original acceptance', actor('Interface agent')+'<h1>Conditions v1 accepted</h1><p>Acceptance entry 223 names offer 221.</p>', subject='commitment-interface', revision='acceptance 223 · conditions v1')
page('work-accepted', 'Revised offer accepted', actor('Interface agent')+'<h1>Conditions v2 accepted</h1><p>Acceptance entry 253 names the new offer.</p><p>Storage agent releases its old block using decision entry 247 · entry 255.</p><div class="read-links">'+read('change-review', 'Read the proposed change')+'</div>', subject='commitment-interface', revision='acceptance 253 · conditions v2')


def identity(pairs):
    return '<dl class="identity">'+''.join(f'<dt>{E(label)}</dt><dd class="hash">{E(value)}</dd>' for label, value in pairs)+'</dl>'


change = actor('Interface agent')+'<h1>Improve empty-list message</h1><p>Change 18 · version 2 · +1 −1</p>'+identity([('Integration', COMMITS['Change 18 integration']), ('Source', COMMITS['Change 18 source'])])+actor('Repository checker', 'checker')+'<p class="check">✓ Checks passed for this integration.</p>'
page('change-review', 'Review Change 18', change+'<div class="read-links">'+read('diff', 'Diff')+'</div>'+actions(link('change-approved', 'Approve version 2', True, 'approve-change-v2'), link('composer-changes', 'Request changes')), back='carousel-change', subject='change18', revision='version 2 · entry 18', acts=['approve-change18-v2'], settles='Review the exact version 2 integration')
page('change-approved', 'Approved Change 18', change+'<p class="check">✓ Version 2 approved.</p><div class="read-links">'+read('diff', 'Diff')+'</div>'+actions(link('receipt-published', 'Publish version 2', True, 'publish-v2')), back='carousel-change', subject='change18', revision='version 2 · approved', acts=['publish-change18-v2'], settles='Publish the approved integration under its current conditions')
failed = actor('Storage agent')+'<h1>Keep task history</h1><p>Change 23 · version 1 · +1 −1</p>'+identity([('Integration', '0c55e181938c5a841617b4901a124f084b0657f2')])+actor('Repository checker','checker')+'<p class="failed">× Two checks failed.</p><p>Storage test: recovery loses an earlier task. Build: type mismatch in the test fixture.</p>'
page('change-failed', 'Failed checks', failed+'<div class="read-links">'+read('diff-failed', 'Diff')+'</div>'+actions(link('composer-changes-failed', 'Request changes')), back='carousel-failed', subject='change23', revision='version 1', settles='Request changes; approval is unavailable')
unknown = actor('Ari','person')+'<h1>Keyboard focus fix</h1><p>Change 9 · version 1</p>'+identity([('Integration', COMMITS['Change 9 integration'])])+'<p class="notice">Publication was requested at entry 9. The reply did not arrive. The outcome is unknown.</p>'
page('change-unknown', 'Unknown publication outcome', unknown+actions(link('change-unavailable', 'Check original request', True, 'check-original-request')), back='carousel-unknown', subject='change9', revision='version 1 · request 9', acts=['check-original-request9'], settles='Recover the outcome of original request 9')
page('change-unavailable', 'Original request unavailable', unknown+'<p class="failed">The original request could not be checked. Its outcome is still unknown.</p>'+actions(link('change-unknown', 'Check original request', True, 'check-original-request')), back='carousel-unknown', subject='change9', revision='version 1 · request 9', acts=['check-original-request9'], settles='Recover the outcome of original request 9')
page('change-stale', 'Superseded change instance', actor('Interface agent')+'<h1>Improve empty-list message</h1>'+ '<p class="failed">Out of date: this card showed version 1. Its acts are disabled.</p>', back='carousel-change', subject='change18', revision='version 1 · superseded', settles='Read the current version')
page('composer-changes', 'Changes request draft', '<h1>Request changes</h1><p>The host composer receives a draft naming the displayed change version. Edit the reason there, then send it.</p><p class="muted">Preparing the draft does not record a review.</p>', back='change-review', subject='change18', revision='version 2')


page('composer-changes-failed', 'Failed change request draft', '<h1>Request changes</h1><p>The host composer receives a draft naming Change 23 version 1 and its failed checks. Edit the reason there, then send it.</p><p class="muted">Preparing the draft does not record a review.</p>', back='change-failed', subject='change23', revision='version 1')
page('change12-review', 'Compare Change 12 versions', actor('Interface agent')+'<h1>Clear completed</h1><p>Change 12 · version 2</p>'+identity([('Integration', COMMITS['Version 2 integration'])])+'<div class="read-links">'+read('file','File')+read('diff12','Diff')+read('interdiff','Compare versions 1 and 2')+'</div>', back='carousel-change', subject='change12', revision='version 2')


def diff_rows(old, new):
    return '<div class="diff" aria-label="Changed lines"><div class="minus"><span>8</span><span></span><span>−</span><code>'+E(old)+'</code></div><div class="plus"><span></span><span>8</span><span>+</span><code>'+E(new)+'</code></div></div>'


diff = '<h1>src/TaskList.tsx</h1>'+identity([('Base',COMMITS['Base']),('Version 2 integration',COMMITS['Change 18 integration'])])+'<p class="muted">All changed lines of this file</p>'+diff_rows('<p>No tasks.</p>','<p>Nothing left to do.</p>')
page('diff', 'Change 18 diff', diff, back='change-review', subject='change18', revision='version 2 · exact endpoints')
task_rows = [(12,12,' ','export function clearCompleted(tasks) {',''),(13,None,'−','  return tasks.filter(task => !task.completed);','minus'),(None,13,'+','  return tasks.map(task => task.completed','plus'),(None,14,'+','    ? { ...task, archived: true }','plus'),(None,15,'+','    : task);','plus'),(14,16,' ','}','')]
task_diff='<div class="diff">'+''.join(f'<div class="{kind}"><span>{old or ""}</span><span>{new or ""}</span><span>{sign}</span><code>{E(code)}</code></div>' for old,new,sign,code,kind in task_rows)+'</div>'
page('interdiff', 'Change 12 version comparison', '<h1>src/tasks.ts</h1>'+identity([('Same base',COMMITS['Base']),('Version 1 source',COMMITS['Version 1 source']),('Version 2 source',COMMITS['Version 2 source']),('Version 1 integration',COMMITS['Version 1 integration']),('Version 2 integration',COMMITS['Version 2 integration'])])+'<p class="muted">Changes since version 1 · all changed lines of this file</p>'+task_diff, back='change12-review', subject='change12', revision='versions 1 → 2 · exact endpoints')
page('diff12', 'Change 12 diff', '<h1>src/tasks.ts</h1>'+identity([('Base',COMMITS['Base']),('Version 2 integration',COMMITS['Version 2 integration'])])+'<p class="muted">1 of 2 files · all changed lines of this file</p>'+task_diff, back='change12-review', subject='change12', revision='version 2 · exact endpoints')
file_lines=[(12,'export function clearCompleted(tasks) {'),(13,'  return tasks.map(task => task.completed'),(14,'    ? { ...task, archived: true }'),(15,'    : task);'),(16,'}')]
file_content='<div class="diff">'+''.join(f'<div><span>{line}</span><span></span><span></span><code>{E(code)}</code></div>' for line,code in file_lines)+'</div>'
page('file', 'Change 12 pinned file excerpt', '<h1>src/tasks.ts</h1>'+identity([('Version 2 integration',COMMITS['Version 2 integration'])])+'<p class="muted">1 of 2 files · lines 12–16 · the rest of this file has not been loaded</p>'+file_content, back='change12-review', subject='change12', revision='version 2 · pinned file excerpt')
page('diff-failed', 'Change 23 diff', '<h1>test/storage.test.ts</h1>'+identity([('Integration','0c55e181938c5a841617b4901a124f084b0657f2')])+diff_rows('expect(history).toHaveLength(3);','expect(history).toHaveLength(0);'), back='change-failed', subject='change23', revision='version 1')
page('diff-unavailable', 'Unavailable diff', '<h1>Diff unavailable</h1><p>The exact requested endpoints could not be read.</p>', back='change-review', subject='change18', revision='version 2 · exact endpoints unavailable')
page('diff-truncated', 'Incomplete diff', diff+'<p class="notice">Only this excerpt was loaded. Other changed lines have not been read.</p>', back='change-review', subject='change18', revision='version 2 · incomplete excerpt')


def updates(incomplete=False):
    groups = []
    for key, scope in SCOPES.items():
        events = [entry for entry in ENTRIES if entry['scope']==key]
        content = f'<section class="group" data-scope="{E(scope["scope"])}" data-inc="{E(scope["inc"])}" data-before="{scope["before"]}" data-through="{scope["through"]}"><h2>{E(scope["label"])}</h2><p class="range">After {scope["before"]} · through {scope["through"]}</p>'
        content += '<details><summary>Scope identity</summary>'+identity([('Scope',scope['scope']),('Incarnation',scope['inc'])])+'</details>'
        for row in events:
            if incomplete and row['scope']=='change9':
                content += '<p class="notice">Entry 9 is unavailable. This range cannot be marked reviewed.</p>'
            else:
                content += f'<article class="event" data-entry="{row["entry"]}"><p class="meta">Entry {row["entry"]} · {E(row["subject"])}</p>'+actor(row['actor'],row['kind'])+'<p>'+E(row['happened'])+'</p></article>'
        groups.append(content+'</section>')
    return '<h1>7 new entries</h1><p class="muted">Three scopes · exact review cut</p>'+''.join(groups)


page('updates', 'Updates since review', updates()+actions(link('updates-reviewed','Mark reviewed',True,'mark-exact-ranges-reviewed')), back='carousel-updates', subject='review-cut', revision='Exact review cut', acts=['mark-exact-ranges-reviewed'], settles='Advance only the three displayed scope/incarnation review positions')
page('updates-incomplete', 'Incomplete updates', updates(True)+'<div class="actions"><span class="button" aria-disabled="true">Complete range required</span></div>', back='carousel-updates', subject='review-cut', revision='incomplete review cut', settles='Load every entry before marking reviewed')
page('updates-reviewed', 'Review points saved', '<p class="check">✓ The listed ranges were marked reviewed.</p>'+''.join(f'<p>{E(s["label"])}: <span class="range">{s["before"]} → {s["through"]}</span></p>' for s in SCOPES.values())+'<p>Newer entries remain unreviewed. No work or decision was settled.</p>', back='carousel-updates', subject='review-cut', revision='exact displayed ranges')
page('receipt-question', 'Question text approved', '<div class="receipt"><span class="check">✓</span><p>Approved question q7 text v2 · entry 246</p></div>'+actor('Storage agent')+'<a class="slide-title" href="question-approved-THEME.html">Keep completed tasks in history?</a><p class="summary">Record the decision on approved text v2.</p>', mode='inline', subject='q7', revision='text v2 · approval 246', receipt='Approved question q7 text v2 · entry 246', settles='Record the decision on approved q7 text v2')
page('receipt-published', 'Publication receipt', '<div class="receipt"><span class="check">✓</span><p>Published Change 18 version 2.</p></div>'+slide(2), mode='inline', back='carousel-change', subject='change23', revision='version 1', receipt='Published Change 18 version 2', settles='Review the failed checks')
page('receipt-context-pending', 'Receipt context pending', '<div class="receipt"><span class="check">✓</span><p>Approved question q7 text v2 · entry 246</p></div><p>Receipt context could not be updated. The approval is already recorded.</p>'+actions(link('receipt-question','Retry receipt update',True,'retry-context-only')), mode='inline', subject='q7', revision='text v2 · approval 246', receipt='Approved question q7 text v2 · entry 246', acts=['retry-context-only'], settles='Update receipt context without repeating approval')
for key,title,body in [('empty','Nothing needs you','The inspected scopes have no matching open request.'),('loading','Loading your items…',''),('unavailable','Items unavailable','The scopes could not be refreshed. Your previous place is kept.'),('partial','Some items are unavailable','Two of three scopes were read. The unread scope remains unknown.')]:
    page(key,title,'<h1>'+E(title)+'</h1><p class="muted">'+E(body)+'</p>',mode='inline')

page('work-settled', 'Delivered work', actor('Interface agent')+'<h1>Button and empty list</h1><p>Delivered by Change 12 version 2.</p>'+identity([('Published integration',COMMITS['Version 2 integration'])])+'<p>The publication and its recorded work settlement are separate from approving question text or revising conditions.</p><div class="read-links">'+read('change12-review','Read the change')+'</div>',subject='commitment-interface',revision='conditions v2 · delivered',settles='Settled work')
page('question-agent-refused','Agent approval refused',question+actor('Interface agent')+'<p class="failed">Approval refused. Interface agent cannot stand in for Ari, the requested person. No approval was recorded.</p>',subject='q7',revision='text v2',waiting='Ari',settles='The requested person approves the exact text',active_actor='Interface agent')
page('question-unrequested','Approval not requested',question+actor('Rin','person')+'<p class="notice">Ari is the requested approver. Rin has no requested approval on this text.</p>',subject='q7',revision='text v2',waiting='Ari',settles='The requested person approves the exact text',active_actor='Rin')
page('change-no-checks','Checker result unavailable',actor('Interface agent')+'<h1>Improve empty-list message</h1>'+identity([('Integration',COMMITS['Change 18 integration'])])+'<p class="notice">The checker result for this integration is unavailable. Approval is unavailable.</p><div class="read-links">'+read('diff','Diff')+'</div>',back='carousel-change',subject='change18',revision='version 2 · checker unknown',settles='Read a checker result for the exact integration')

# Two refreshed parent snapshots illustrate stable identity and clamping.
approved = list(SLIDES)
approved[0] = ('question-approved', approved[0][1], 'Record the decision on approved text v2.', 'Storage agent', 'agent', 'question-approved', 'q7', 'text v2 · approval 246')
page('carousel-question-approved', 'Approved question needs a decision', slide(0, approved), mode='inline', subject='q7', revision='text v2 · approval 246', settles='Record the decision on approved text v2')
refreshed = [(('refreshed-'+row[0]), *row[1:]) for row in SLIDES[1:]]
for i,row in enumerate(refreshed):
    page('carousel-'+row[0],row[1],slide(i,refreshed),mode='inline',subject=row[6],revision=row[7],settles=row[2])
PAGES['question-approved']['content'] = PAGES['question-approved']['content'].replace('carousel-question-THEME.html','carousel-question-approved-THEME.html')
PAGES['decision-recorded']['content'] = PAGES['decision-recorded']['content'].replace('carousel-question-THEME.html','carousel-refreshed-change-THEME.html')
for key in ['receipt-question','receipt-context-pending']:
    PAGES[key]['back']='carousel-question-approved'
for data in PAGES.values():
    subject=data['subject']
    which = 'issue' if subject=='q7' or subject=='clear-completed' or subject.startswith('commitment-') else 'change18' if subject=='change18' else 'change9' if subject=='change9' else None
    if data['title']=='Delivered work':
        which=None
    if data['receipt']:
        data['context']['receipt']=data['receipt']
    if data['context']['settlesBy'].startswith('Settled') or data['title']=='Review points saved':
        data['context']['waitingOn']=None
    if which:
        source=SCOPES[which]
        through=source['through']
        if subject=='q7':
            through=247 if 'decision 247' in data['revision'] else 246 if '246' in data['revision'] else 245
        elif which=='issue':
            through=255 if 'acceptance 253' in data['revision'] else 253 if '253' in data['revision'] else 252 if '252' in data['revision'] else 251 if '251' in data['revision'] else 223 if '223' in data['revision'] else 221 if '221' in data['revision'] else 250 if 'v2' in data['revision'] else 247
        data['context']['entryPositionsRead']=[{'scope':source['scope'],'inc':source['inc'],'through':through}]
    elif subject=='review-cut':
        data['context']['entryPositionsRead']=[{'scope':v['scope'],'inc':v['inc'],'after':v['before'],'through':v['through']} for v in SCOPES.values()]
    else:
        data['context']['entryPositionQualification']='No scope-position fixture was supplied for this standalone state.'

OUT.mkdir(exist_ok=True)
manifest = {'kind':'static-compact-card-design','noLiveActs':True,'browserPlugin':'not available','themes':['light','dark'],'commits':COMMITS,'catchupScopes':SCOPES,'catchupEntries':ENTRIES,'pages':[]}
for theme in manifest['themes']:
    for key, data in PAGES.items():
        content = data['content'].replace('THEME',theme)
        if data['mode']=='inline':
            if data['receipt']:
                content = '<a class="back" href="'+data['back']+'-'+theme+'.html">‹ Back</a>'+content
            host = '<p class="host-prompt">What needs me?</p><p class="host-line">'+'Here is what needs you.'+'</p>'
        else:
            host = ''
        document = '<!doctype html><html lang="en" data-theme="'+theme+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+E(data['title'])+' · static card design</title><link rel="icon" href="data:,"><link rel="stylesheet" href="cards.css"><script src="preview.js" defer></script></head><body class="'+data['mode']+'"><main class="host">'+host+'<div class="frame"><article class="card" data-content-root data-screen="'+key+'" data-subject="'+E(data['subject'])+'" data-revision="'+E(data['revision'])+'">'+content+'</article></div></main></body></html>'
        file=f'{key}-{theme}.html'
        (OUT/file).write_text(document+'\n')
        manifest['pages'].append({k:v for k,v in data.items() if k!='content'}|{'key':key,'theme':theme,'path':file})
    listing=''.join('<li>'+read(key,data['title']).replace('THEME',theme)+'</li>' for key,data in PAGES.items())
    (OUT/f'index-{theme}.html').write_text('<!doctype html><html lang="en" data-theme="'+theme+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Compact card design examples</title><link rel="stylesheet" href="cards.css"><main class="index"><h1>Compact card examples</h1><p>Fictional static design. Links navigate between examples; they perform no real acts. Full-screen pages illustrate the detail surface, not an actual host transition.</p><p>'+read('index','Other theme').replace('THEME','dark' if theme=='light' else 'light')+'</p><ul>'+listing+'</ul></main></html>\n')
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print(f'Wrote {len(PAGES)} states in two themes, plus indexes and a fixture manifest.')
