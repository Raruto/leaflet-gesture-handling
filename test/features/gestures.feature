Feature: Gesture handling
  @issue-18
  Scenario Outline: Public bundles keep handler lifecycle and map events working
    Given the "<bundle>" map bundle is open
    Then gesture handlers support popups and fullscreen transitions
    And disabling and reenabling gesture handling cleans its listeners

    Examples:
      | bundle   |
      | readable |
      | minified |

  @issue-19
  Scenario: Unmodified scrolling warns and restores map zoom
    Given the map is open
    When I scroll over the map without a modifier
    Then the scroll warning is shown and zoom is temporarily disabled
    And zoom is restored after the warning expires

  @issue-30
  Scenario: Ctrl scrolling over the warning zooms the map instead of the page
    Given the map is open
    When I scroll over the map without a modifier
    And I use Ctrl+scroll over the map
    Then page zoom is prevented and the map zooms

  @issue-30
  Scenario Outline: Ctrl scrolling from interactive map layers zooms the map
    Given the map is open
    When I use Ctrl+scroll over a "<layer>" while the warning is active
    Then page zoom is prevented and the map zooms

    Examples:
      | layer        |
      | marker       |
      | circle marker|

  @issue-5 @issue-30
  Scenario Outline: Ending a touch on an ignored layer restores map interactions
    Given the map is open
    When a one-finger touch ends on a "<layer>"
    Then map interactions are restored after the ignored touch

    Examples:
      | layer        |
      | marker       |
      | circle marker|

  @issue-30
  Scenario: A reinitialized map handles Ctrl scrolling
    Given the map is open
    When I reinitialize the map
    When I scroll over the reinitialized map with Ctrl
    Then page zoom is prevented and the map zooms

  @issue-30
  Scenario: The gesture warning fades inside a shadow root
    Given the map is open
    When I create a map inside a shadow root
    When I scroll over the shadow map without a modifier
    Then its warning appears and clears after the timeout

  @issue-30
  Scenario: Real Ctrl+wheel gestures hide the warning at once and keep zooming the map
    Given the map is open
    When I scroll over the map without a modifier
    And I use real Ctrl+wheel twice over the map
    Then the map zoomed twice and the warning is gone

  @issue-30
  Scenario: Ctrl scrolling over a MarkerCluster zooms the map
    Given the map is open
    When I scroll over a remote MarkerCluster with Ctrl
    Then page zoom is prevented and the map zooms

  @issue-5 @issue-11 @issue-12 @issue-26
  Scenario: Touch interactions recover after release and allow two-finger movement
    Given the map is open
    When I use repeated one-finger touches and then move two fingers on the map
    Then one-finger warnings and map interactions recover after release
    And the two-finger event is prevented and map interactions are enabled

  @issue-6
  Scenario: Ctrl scrolling over a popup prevents page zoom
    Given the map is open
    When I use Ctrl+scroll over the popup
    Then page zoom is prevented over the popup

  @issue-14 @issue-17
  Scenario: Touching map controls does not activate gesture handling
    Given the map is open
    When I touch a map control
    Then the control touch does not show a gesture warning

  @issue-18
  Scenario: Disabled map handlers stay disabled when options are false
    Given the map is open
    When gesture handling processes disabled map options
    Then it leaves the map handlers unchanged

  @issue-2
  Scenario: German scroll warnings include the full shortcut
    Given the map is open with locale "de"
    When the locale is loaded
    Then German scroll instructions include the keyboard shortcut

  @issue-20
  Scenario: A regional browser language uses its locale file
    Given the map is open with locale "fr-CA"
    When the locale is loaded
    Then the French warning is available
    And only the Canadian French locale was requested

  @issue-20
  Scenario: An available regional translation is selected directly
    Given the map is open with locale "pt-PT"
    When the locale is loaded
    Then the Portugal-specific warning is available
    And only the Portugal locale was requested

  @issue-20
  Scenario: Regional variants never request missing locale files
    Given the map is open
    Then regional variants of every available language load without errors