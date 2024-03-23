#pragma once

#include <nlohmann/json.hpp>
#include <cpprealm/sdk.hpp>
#include <fstream>

#include "ftxui/component/component.hpp"
#include "controller.hpp"
#include "navigation.hpp"
#include "../managers/auth_manager.hpp"
#include "../managers/error_manager.hpp"
#include "../app_state.hpp"
#include "../database_state.hpp"
#include "home_controller.hpp"
#include "login_controller.hpp"
#include "../app_config_metadata.hpp"

class AppController final : public Controller, public AuthManager::Delegate, public ErrorManager::Delegate {
 private:
  AppState _appState;
  Navigation _navigation;

  bool _showErrorModal{true};
  bool isUserLoggedIn{false};
  ftxui::Component _errorModal;

 public:
  explicit AppController(ftxui::ScreenInteractive *screen);

  void onFrame() override;

 private:
  void onRegisteredAndLoggedIn() override;

  void onLoggedIn() override;

  void onLoggedOut() override;

  void onError(ErrorManager &error) override;

  void onErrorCleared(ErrorManager &error) override;
};