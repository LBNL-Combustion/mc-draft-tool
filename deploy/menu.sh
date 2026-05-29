#!/bin/bash
# filename: menu.sh
# purpose: interactive deploy helper for frontend and backend services
# usage: bash menu.sh (run from inside deploy/)

# Color support detection
if [ -t 1 ]; then
  RED="\033[31m"
  GREEN="\033[32m"
  YELLOW="\033[33m"
  BLUE="\033[34m"
  BOLD="\033[1m"
  RESET="\033[0m"
else
  RED=""
  GREEN=""
  YELLOW=""
  BLUE=""
  BOLD=""
  RESET=""
fi

print_header() {
  echo -e "\033[34m"
  echo -e "========================================"
  echo -e "   MONOREPO DEPLOYMENT UTILITY          "
  echo -e "========================================\033[0m"
}

print_success() {
  echo -e "\033[32m$1\033[0m"
}

print_error() {
  echo -e "\033[31m$1\033[0m"
}

print_warning() {
  echo -e "\033[33m$1\033[0m"
}

pause() {
  printf "\nPress Enter to continue..."
  read -r _
}

check_frontend() {
  if [ -d "../frontend" ] && [ -f "../frontend/Dockerfile" ]; then
    print_success "a. frontend directory and Dockerfile: PASS ✅"
    return 0
  fi
  print_error "a. frontend directory and Dockerfile: FAIL ❌"
  return 1
}

check_backend() {
  if [ -d "../backend" ] && [ -f "../backend/Dockerfile" ]; then
    print_success "b. backend directory and Dockerfile: PASS ✅"
    return 0
  fi
  print_error "b. backend directory and Dockerfile: FAIL ❌"
  return 1
}

check_docker() {
  if command -v docker >/dev/null 2>&1; then
    print_success "c. docker installed in PATH: PASS ✅"
    return 0
  fi
  print_error "c. docker installed in PATH: FAIL ❌"
  return 1
}

check_docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    print_success "d. docker compose available: PASS ✅"
    return 0
  fi
  print_error "d. docker compose available: FAIL ❌"
  return 1
}

run_requirements_checks() {
  local status=0

  check_frontend || status=1
  check_backend || status=1
  check_docker || status=1
  check_docker_compose || status=1

  if [ "$status" -eq 0 ]; then
    print_success "\nAll system requirements passed. Deployment should work."
  else
    print_warning "\nOne or more requirements failed. Deployment may not work until issues are fixed."
  fi

  return "$status"
}

requirements_ok() {
  check_frontend >/dev/null 2>&1 && check_backend >/dev/null 2>&1 && check_docker >/dev/null 2>&1 && check_docker_compose >/dev/null 2>&1
}

deploy_service() {
  local service_name="$1"

  if ! requirements_ok; then
    print_error "Requirements check failed. Please fix requirements first."
    return 1
  fi

  printf "Building %s...\n" "$service_name"
  if ! docker compose build "$service_name"; then
    print_error "Failed to build $service_name."
    print_warning "Check logs with: docker compose logs $service_name"
    return 1
  fi

  printf "Starting %s...\n" "$service_name"
  if ! docker compose up -d "$service_name"; then
    print_error "Failed to start $service_name."
    print_warning "Check logs with: docker compose logs $service_name"
    return 1
  fi

  print_success "Successfully deployed $service_name."
  printf "%s service should now be running on its configured exposed port.\n" "$service_name"
  return 0
}

main_menu() {
  while true; do
    clear
    print_header
    cat <<EOF
1. Check System Requirements
2. Deploy Frontend
3. Deploy Backend
0. Exit
EOF
    printf "\nSelect an option: "
    read -r choice

    case "$choice" in
      1)
        clear
        print_header
        run_requirements_checks
        pause
        ;;
      2)
        clear
        print_header
        if deploy_service frontend; then
          print_success "Frontend deployment completed successfully."
        fi
        pause
        ;;
      3)
        clear
        print_header
        if deploy_service backend; then
          print_success "Backend deployment completed successfully."
        fi
        pause
        ;;
      0)
        print_success "Exiting. Goodbye."
        exit 0
        ;;
      *)
        print_warning "Invalid selection. Please choose a valid option."
        pause
        ;;
    esac
  done
}

main_menu
