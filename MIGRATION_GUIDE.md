# Migration Guide: Old Files to Remove

After verifying that the Next.js conversion works correctly, you can safely remove these old files that are no longer needed:

## Files to Remove

### Entry Point Files
- `index.html` - Replaced by `app/layout.tsx`
- `index.tsx` - Next.js handles entry automatically

### Configuration Files
- `vite.config.ts` - Replaced by `next.config.js`
- `metadata.json` - Integrated into `app/layout.tsx`

### Source Files (Moved)
- `App.tsx` - Converted to `app/page.tsx` and component files
- `types.ts` - Moved to `lib/types.ts`
- `services/audioUtils.ts` - Moved to `lib/services/audioUtils.ts`

## Cleanup Command

After testing, you can run:

```bash
# Remove old files
rm index.html index.tsx App.tsx types.ts vite.config.ts metadata.json
rm -rf services/
```

## Verification Checklist

Before removing old files, verify:

- [ ] `npm run dev` starts successfully
- [ ] Application loads at http://localhost:3000
- [ ] Voice assistant can be engaged
- [ ] Tasks can be created, completed, and deleted
- [ ] LocalStorage persistence works
- [ ] All styles and animations render correctly
- [ ] No console errors

## Keeping Old Files

If you want to keep the old files for reference, you can:
1. Create a `_archive/` folder
2. Move old files there
3. Add `_archive/` to `.gitignore` if desired

## Next Steps

1. Test the application thoroughly
2. Remove old files once verified
3. Update any deployment configurations
4. Commit the Next.js version to version control
