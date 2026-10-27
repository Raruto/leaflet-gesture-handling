Feature: Gesture handling
  Scenario Outline: Public bundles keep handler lifecycle and map events working
    Given the "<bundle>" map bundle is open
    Then gesture handlers support popups and fullscreen transitions
    And disabling and reenabling gesture handling cleans its listeners

    Examples:
      | bundle   |
      | readable |
      | minified |

  Scenario: Unmodified scrolling warns and restores map zoom
    Given the map is open
    When I scroll over the map without a modifier
    Then the scroll warning is shown and zoom is temporarily disabled
    And zoom is restored after the warning expires

  Scenario: One-finger movement warns and two-finger movement is allowed
    Given the map is open
    When I move one finger and then two fingers on the map
    Then the touch warning is shown for one finger
    And the two-finger event is prevented and map interactions are enabled

  Scenario: A regional browser language uses its locale file
    Given the map is open with locale "fr-CA"
    When the locale is loaded
    Then the French warning is available
    And only the Canadian French locale was requested

  Scenario: An available regional translation is selected directly
    Given the map is open with locale "pt-PT"
    When the locale is loaded
    Then the Portugal-specific warning is available
    And only the Portugal locale was requested

  Scenario: Regional variants never request missing locale files
    Given the map is open
    Then regional variants of every available language load without errors
