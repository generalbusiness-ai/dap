import { arr, guard, obj, op, path, privateValue, read, type Declaration } from '../schema.ts';
import { splitRecord } from '../split.ts';
const split = splitRecord({ key: 'id', capability: 'example.discussion.post',
  columns: {
    id: { type: 'string', readers: 'members', value: path('payload.id') },
    title: { type: 'string', readers: 'members', value: path('payload.title') },
    text: { type: 'string', readers: 'author', value: path('payload.text') },
  },
  parts: { members: { table: 'posts', kind: 'example.discussion.post', max: 'members' }, author: { table: 'texts', kind: 'example.discussion.post_text', max: 'author' } },
  guards: [guard(op('id', path('payload.id')), 'malformed')], candidates: arr(obj({ id: 'example', title: '', text: '' })),
});
export const discussion: Declaration = { name: 'example.discussion', model: 'discussion', roles: { Writer: ['example.discussion.post'] }, readers: { author: { recipients: [path('actor')] } }, ...split,
  query: obj({ posts: read('posts', 'rows', { as: 'post', select: obj({ id: path('post.id'), title: path('post.title'), text: privateValue('author', { op: 'get', value: read('texts', 'latest', { key: path('post.id') }), field: 'text' }) }) }) }),
  invariants: [], supportDisclosure: ['ai.generalbusiness.dap.attach'], backlogBy: 'creator' };
