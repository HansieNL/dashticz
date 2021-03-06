.. _buttons:

Buttons
=======

Buttons are clickable elements that may show an image. First you have to define the button in ``CONFIG.js``::

    buttons = {}            //only once!!
    buttons.yr = {
    	width: 12,
      isimage: true,
      refresh: 60,
    	btnimage: 'https://www.yr.no/sted/Norge/Oppland/%C3%98ystre_Slidre/Beito/advanced_meteogram.png',
    	url: 'https://www.yr.no/sted/Norge/Oppland/%C3%98ystre_Slidre/Beito/langtidsvarsel.html'
    };

    // Then add the button to a specific column:
    var columns = {}          //This line only once!!
    columns['3'] = {
      blocks:  [
          ...,
          buttons.yr,
          ...
      ], 
      width: 1
    }


Parameters
----------

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - width
    - ``1..12``: The width of the block relative to the column width
  * - title
    - ``'<string>'``: Custom title for the block
  * - key
    - ``'key'``: unique identifier.
  * - slide
    - ``1..99``: Slide to specified screen on click.
  * - isimage
    - Set to ``true`` if the image should be shown in the full button width (default ``false``).
  * - icon
    - ``'fas fa-icon'``: icon to show in the button.
  * - image
    - ``'image.png'``: image to show as icon the button. Image path is relative to the <dashticz>/img folder.
  * - btnimage
    - ``'<url>'``: URL of the image to show in the button.
  * - refresh
    - ``1..99999``: Refresh time of the button image in seconds. There is no maximum. The default is 60 (=1 minute).
  * - url
    - ``'<url>'``: URL of the page to open in a popup window on click. 
  * - popup
    - ``'mypopup'``: Opens the  'mypopup' block in a new window on click.
  * - forceheight
    - | Set the height of the image in a button
      | ``'200px'``: Set image height to 200px. 
  * - framewidth
    - ``'<integer>'``: specific width of the popup window on click. 
  * - frameheight
    - ``'<integer>'``: specific height of the popup window on click. 
  * - forcerefresh
    - | Control the caching-prevention mechanism of the images and popup frame for a button.
      | ``0`` : Normal caching behavior (=default)
      | ``1``,  ``true`` : Prevent caching by adding t=<timestamp> parameter to the url as second parameter. Try this if you have a (cheap Chinese) webcam. Not all webservers will handle this correctly
      | ``2`` : The image is loaded via php, preventing caching. (php must be enabled on your Dashticz server)
      | ``3`` : Prevent caching by adding t=<timestamp> parameter to the end of the url. Not all webservers will handle this correctly.      
  * - refreshiframe
    - | ``0``: No automatic refresh of a button popup frame (default)
      | ``1..99999``: Refresh time of the button popup frame in sec. There is no maximum. The default is 60 (=1 minute).   
  * - level
    - Domoticz log level used by the log-button.
  * - newwindow
    - | ``0``: open in current window
      | ``1``: open in new window
      | ``2``: open in new frame (default, to prevent a breaking change in default behavior)
      | ``3``: no new window/frame (for intent handling, api calls). HTTP get request.
      | ``4``: no new window/frame (for intent handling, api calls). HTTP post request. (forcerefresh not supported)
      | ``5``: open in a new browser tab
  * - auto_close
    - | Closes the opened window after a certain period of time (only applicable when newwindow is 1,2 or 5)
      | ``0``: (=Default) No auto close
      | ``5``: Closes the popup window after 5 seconds.
  * - password
    - | Password protect switches, buttons, thermostats, sliders, blinds
      | ``'secret'``: Password to use

Usage
-----

.. _slidebutton:

Slide button
~~~~~~~~~~~~
If you have added the ``slide`` parameter to a button, then Dashtics will slide to the specific screen if the button is pressed.

If you use a button to slide to specific screen (menu button), then the background color of that button will change if that specific screen is active.

Example: If screen number 2 is the active screen, then a button with parameter ``slide:2`` will be shown as active.

You can adapt the formatting of the selected button with the class ``.selectedbutton`` in your ``custom.css``. Example::

    .selectedbutton {
      background-color: #cba !important;
    }

Example on how to use menu buttons::

    //three buttons are defined
    buttons.page1 = { width:12, title:'page 1', slide:1};
    buttons.page2 = { width:12, title:'page 2', slide:2};
    buttons.page3 = { width:12, title:'page 3', slide:3};
    
    //definition of a menu column
    var columns = {}          //This line only once!!
    columns['menu'] = {
      blocks:  [ buttons.page1, buttons.page2, buttons.page3],
      width: 1
    }

    //Define columns 1 to 6 as well
    // ...

    //Add the menu column to your screens
    var screens = {}        //This line only once!
    screens[1] = {
      columns: ['menu', 1,2]  
    }
    screens[2] = {
      columns: ['menu', 3,4]  
    }
    screens[3] = {
      columns: ['menu', 5,6]  
    }

.. _forcerefresh:

forcerefresh
~~~~~~~~~~~~

   Control the caching-prevention mechanism of the images for a button.
   
   ``0`` : Normal caching behavior (=default)

   ``1`` (or ``true``) : Prevent caching by adding t=<timestamp> parameter to the url. Not all webservers will handle this correctly

   ``2`` :               The image is loaded via php, preventing caching. (php must be enabled on your Dashticz server)

Examples
--------

Additional examples of button definitions::

    var buttons = {}
    buttons.buienradar = {width:12, isimage:true, refresh:60, btnimage: 'https://image.buienradar.nl/2.0/image/animation/RadarMapRainNL?height=300&width=360&extension=gif&renderBackground=True&renderBranding=False&renderText=True&history=3&forecast=6&skip=1', url: 'https://www.buienalarm.nl/amsterdam-noord-holland-nederland/52.3727,4.8936'}
    buttons.radio = {width:12, image: 'radio_on.png', title: 'Radio', url: 'http://nederland.fm'}
    buttons.nunl = {width:12, icon: 'far fa-newspaper', title: 'Nu.nl', url: 'http://www.nu.nl'}
    buttons.webcam = {width:12, isimage:true, refresh:2, btnimage: 'http://ip_url_to_webcam', url: 'http://ip_url_to_webcam', framewidth:500, frameheight:400}

To remove the close button of the button-popup add the following text to custom.css::

  .frameclose { display: none; }
