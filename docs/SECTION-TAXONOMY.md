# Section taxonomy (feature/section-taxonomy)

**Status:** Built on branch `feature/section-taxonomy`. **Do not merge to `main` until team approval.**

## Model

| Field | Meaning | Values |
|--------|---------|--------|
| `Post.category` | **Section / desk** | `news`, `politics`, `faith`, `family`, `print-edition` |
| `Post.format` | **News vs op-ed** | `news` (reportage), `opinion` (op-ed) |

Any section can be News or Opinion (e.g. Politics + Opinion, Faith + News).

**Print Edition** = both a section for stories and the existing `/print-edition` product.

**America 250** = flag + page (unchanged). **Videos** = `/videos` (in main nav on this branch).

## Nav (this branch)

Main: **News · Politics · Faith · Family · America 250 · Print Edition · Videos**

Footer also links **Opinion** → `/opinion` (all `format=opinion` across desks).

## Redirects (SEO)

| From | To |
|------|-----|
| `/category/opinion` | `/opinion` (301) |
| `/category/Opinion` | `/opinion` (301) |

Article URLs (`/article/...`) **never change**.

## Migration plan (auto-generated)

1. `node scripts/audit-categories.mjs` → `scripts/category-migration-plan.json`
2. Review titles / mapping with editorial
3. On go-live: merge branch, then  
   `node scripts/migrate-sections.mjs --apply`

### Counts from latest audit (~244 posts)

| New section | News format | Opinion format | Total |
|-------------|-------------|----------------|-------|
| faith | 87 | 6 | 93 |
| news | 70 | 6 | 76 |
| politics | 17 | 32 | 49 |
| family | 6 | 3 | 9 |
| print-edition | 16 | 1 | 17 |

Heuristic rules (title keywords + old category + printEditionId):

- Old `faith` → section faith / format news  
- Old `opinion` / `Opinion` → format opinion; section by keywords (default politics)  
- Old `news` → news unless politics/faith/family keywords  
- Rows with `printEditionId` → section print-edition  

Editors can change **Section** + **Format** on any post after migration.

## Go-live checklist

- [ ] Team reviews `category-migration-plan.json`
- [ ] Preview branch on Railway (optional PR environment)
- [ ] Merge `feature/section-taxonomy` → `main`
- [ ] Deploy
- [ ] `node scripts/migrate-sections.mjs --apply` against production
- [ ] Spot-check: nav, `/opinion`, old `/category/opinion` 301, a few article URLs
- [ ] Search Console: submit updated sitemaps if needed

## Email / push prefs

Still three buckets: News / Faith / Opinion.

- `format=opinion` → Opinion list  
- `section=faith` + reportage → Faith list  
- everything else (news, politics, family, print-edition reportage) → News list  
