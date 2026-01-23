#!/bin/bash

# Trail Tales - First Time GitHub Push
# Run this script to push your code to GitHub for the first time

echo "🏔️  Trail Tales - Push to GitHub"
echo ""
echo "Before running this script, make sure you've created a repository on GitHub:"
echo "  1. Go to https://github.com/new"
echo "  2. Create a new repository (public or private)"
echo "  3. Don't initialize with README, .gitignore, or license"
echo ""
read -p "Have you created a GitHub repository? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Please create a GitHub repository first, then run this script again."
    exit 1
fi

echo ""
echo "Enter your GitHub username:"
read github_username

echo "Enter your repository name:"
read repo_name

if [ -z "$github_username" ] || [ -z "$repo_name" ]; then
    echo "❌ Username and repository name are required"
    exit 1
fi

# Construct the repository URL
repo_url="https://github.com/${github_username}/${repo_name}.git"

echo ""
echo "Repository URL: $repo_url"
echo ""

# Check if remote already exists
if git remote | grep -q "^origin$"; then
    echo "ℹ️  Remote 'origin' already exists. Updating..."
    git remote set-url origin "$repo_url"
else
    echo "Adding remote 'origin'..."
    git remote add origin "$repo_url"
fi

# Make sure we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "Switching to 'main' branch..."
    git checkout -b main 2>/dev/null || git checkout main
fi

# Add all files
echo "Adding all files..."
git add .

# Check if there's anything to commit
if git diff --staged --quiet; then
    echo "No changes to commit"
else
    echo "Creating initial commit..."
    git commit -m "Initial commit: Trail Tales Appalachian Trail journal app

- React + Vite frontend with beautiful UI
- Bun + Hono backend API
- SQLite database with Prisma ORM
- Simple admin password authentication
- Interactive map with Leaflet
- Journal entries, photos, and statistics
- Ready for deployment to Vercel + Railway"
fi

# Push to GitHub
echo ""
echo "Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your code is now on GitHub!"
    echo ""
    echo "View your repository at:"
    echo "  https://github.com/${github_username}/${repo_name}"
    echo ""
    echo "Next steps:"
    echo "  1. View your code on GitHub"
    echo "  2. Deploy to Vercel + Railway (see QUICKSTART.md)"
    echo "  3. Start adding journal entries!"
else
    echo ""
    echo "❌ Push failed. Common reasons:"
    echo "  - Repository doesn't exist on GitHub"
    echo "  - You need to login with GitHub credentials"
    echo "  - Repository name is incorrect"
    echo ""
    echo "Try running manually:"
    echo "  git push -u origin main"
fi
