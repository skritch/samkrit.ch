# First:
# git remote set-url --push github <github url>
# git config remote.github.push refs/heads/github:refs/heads/main
git checkout github
git checkout master -- .
git add -A
git commit -m "Sync: $(git log -1 --oneline master)"
# Then:
# git push -u github github:main