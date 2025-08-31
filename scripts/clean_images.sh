
#!/bin/bash

ls -1 "$1"/*.png 2>/dev/null | while read file; do
  convert "$file" -strip -alpha set -fuzz 10% -transparent white "${file%.*}.png"
done