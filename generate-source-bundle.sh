#!/bin/bash

OUTPUT_FILE="webapp/public/TRAIL_TALES_SOURCE_CODE.txt"

echo "# Trail Tales - Complete Source Code Bundle" > "$OUTPUT_FILE"
echo "# Generated: $(date)" >> "$OUTPUT_FILE"
echo "# ==========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Project structure
echo "## PROJECT STRUCTURE" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
tree -I 'node_modules|.git|dist|.vite|dev.db|bun.lock|*.log' --noreport 2>/dev/null || find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.prisma" -o -name "*.md" -o -name "*.html" \) | grep -v node_modules | grep -v .git | sort
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to add file with header
add_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo "================================================" >> "$OUTPUT_FILE"
        echo "FILE: $file" >> "$OUTPUT_FILE"
        echo "================================================" >> "$OUTPUT_FILE"
        cat "$file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

# Root files
echo "## ROOT FILES" >> "$OUTPUT_FILE"
add_file "CLAUDE.md"
add_file "README.md"
add_file "DEVELOPMENT_SPEC.md"

# Frontend config
echo "## FRONTEND CONFIG" >> "$OUTPUT_FILE"
add_file "webapp/package.json"
add_file "webapp/vite.config.ts"
add_file "webapp/tailwind.config.ts"
add_file "webapp/tsconfig.json"
add_file "webapp/index.html"

# Frontend source
echo "## FRONTEND SOURCE" >> "$OUTPUT_FILE"
add_file "webapp/src/main.tsx"
add_file "webapp/src/App.tsx"
add_file "webapp/src/index.css"

# Frontend pages
echo "## FRONTEND PAGES" >> "$OUTPUT_FILE"
for file in webapp/src/pages/*.tsx; do
    add_file "$file"
done

# Frontend components (non-UI)
echo "## FRONTEND COMPONENTS" >> "$OUTPUT_FILE"
for file in webapp/src/components/*.tsx; do
    add_file "$file"
done

# Frontend data
echo "## FRONTEND DATA" >> "$OUTPUT_FILE"
add_file "webapp/src/data/journalEntries.ts"

# Frontend lib/hooks
echo "## FRONTEND LIB/HOOKS" >> "$OUTPUT_FILE"
add_file "webapp/src/lib/utils.ts"
add_file "webapp/src/hooks/use-toast.ts"

# Backend config
echo "## BACKEND CONFIG" >> "$OUTPUT_FILE"
add_file "backend/package.json"
add_file "backend/tsconfig.json"

# Backend source
echo "## BACKEND SOURCE" >> "$OUTPUT_FILE"
add_file "backend/src/index.ts"
add_file "backend/src/auth.ts"
add_file "backend/src/prisma.ts"
add_file "backend/src/env.ts"
add_file "backend/src/types.ts"

# Backend routes
echo "## BACKEND ROUTES" >> "$OUTPUT_FILE"
for file in backend/src/routes/*.ts; do
    add_file "$file"
done

# Prisma schema
echo "## DATABASE SCHEMA" >> "$OUTPUT_FILE"
add_file "backend/prisma/schema.prisma"

echo "Source bundle generated: $OUTPUT_FILE"
wc -l "$OUTPUT_FILE"
