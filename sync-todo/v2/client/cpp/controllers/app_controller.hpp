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
//  AppController();
  AppController(ftxui::ScreenInteractive *screen) {
    _appState.screen = screen;

    /** Read the contents of the atlasConfig.json to get the metadata for the App Services App.
     * This path assumes you are running the app from a `/build` directory within this project. If you're
     * running the app somewhere else, update the path to your atlasConfig.json accordingly. */
    std::ifstream f("../atlasConfig.json");
    nlohmann::json data = nlohmann::json::parse(f);
    auto appConfigMetadata = data.template get<AppConfigMetadata>();
    f.close();

    auto appConfig = realm::App::configuration {
        .app_id = appConfigMetadata.appId
    };
    _appState.app = std::make_unique<realm::App>(appConfig);
    _appState.authManager = std::make_unique<AuthManager>(this);
    //_appState.authManager->logIn(_appState.app.get(), "dac", "testing9786");
    _appState.errorManager = std::make_unique<ErrorManager>(this);

    _errorModal = ftxui::Container::Vertical({
      ftxui::Renderer([this] {
        return ftxui::text(_appState.errorManager->getError().value());
      }),
      ftxui::Button("Dismiss", [=] {
        _appState.errorManager->clearError();
      }),
      });

    component()->Add(_navigation.component());

    if (_appState.app->get_current_user()) {
      isUserLoggedIn = true;
    }

    if (isUserLoggedIn) {
      _navigation.goTo(std::make_unique<HomeController>(&_appState));
    } else {
      _navigation.goTo(std::make_unique<LoginController>(&_appState));
    }
  }

  void onFrame() override;

 private:
  void onRegisteredAndLoggedIn() override {
    _navigation.goTo(std::make_unique<HomeController>(&_appState));
  }

  void onLoggedIn() override {
    _navigation.goTo(std::make_unique<HomeController>(&_appState));
  }

  void onLoggedOut() override {
    _navigation.goTo(std::make_unique<LoginController>(&_appState));
  }

  void onError(ErrorManager &error) override {
    _errorModal->Detach();
    component()->Add(_errorModal);
    _errorModal->TakeFocus();
  }

  void onErrorCleared(ErrorManager &error) override {
    _errorModal->Detach();
  }
};