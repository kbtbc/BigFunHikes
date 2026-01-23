#!/bin/bash

# Trail Tales - Save Changes to Git
# This script commits your current changes

echo "🏔️  Trail Tales - Saving Changes to Git"
echo ""

# Show what will be committed
echo "Files to be saved:"
git status --short

echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Add all changes
    git add .

    # Create commit
    echo ""
    echo "Enter a description of your changes (e.g., 'Updated admin authentication'):"
    read commit_message

    if [ -z "$commit_message" ]; then
        commit_message="Update Trail Tales app"
    fi

    git commit -m "$commit_message"

    echo ""
    echo "✅ Changes saved to git!"
    echo ""
    echo "To push to GitHub (if you've set up a remote):"
    echo "  git push"
    echo ""
fi
