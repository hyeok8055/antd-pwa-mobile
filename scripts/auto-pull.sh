#!/bin/bash

# Git 자동 pull 스크립트
# dev_host 브랜치의 변경사항을 감지하고 자동으로 pull 합니다.

BRANCH="dev_host"
REPO_PATH="$(pwd)"

while true; do
    echo "[$(date)] Checking for changes in $BRANCH branch..."
    
    # 현재 브랜치가 dev_host인지 확인
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
        echo "Switching to $BRANCH branch..."
        git checkout $BRANCH
    fi
    
    # 원격 저장소의 변경사항 확인
    git fetch origin
    
    # 로컬과 원격의 차이 확인
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u})
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        echo "Changes detected! Pulling latest changes..."
        git pull origin $BRANCH
        echo "Pull completed successfully!"
    else
        echo "No changes detected."
    fi
    
    # 30초 대기 후 다시 확인
    sleep 30
done 