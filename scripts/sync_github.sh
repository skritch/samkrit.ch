
git checkout github
git checkout master -- .
git add -A
git commit -m "Sync with master as of $(date): $(git log -1 --oneline master)"
# Then git push -u github github:main