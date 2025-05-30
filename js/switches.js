/* global showUpdateInformation settings getDevices language infoMessage iconORimage getBlockData blocks */
/* global moment hexToHsb md5*/
/* from main.js */
// eslint-disable-next-line no-unused-vars
/* global sliding:writable  slide:writable*/
/* from domoticz-api.js*/
/* global Domoticz*/
/* from dt_function.js*/
/* global DT_function choose*/
/* from dial.js */
/* global DT_dial */
/* from blocks.js */
/* global getBlockTitle */
/* from colorpicker.js */
/* global Colorpicker */
/* from version.js */

/*exported reqSlideDeviceAsync*/

var spectrumColors = {};

/** Returns a default switch block
 *
 * @param {object} block - The Dashticz block definition
 */
// eslint-disable-next-line no-unused-vars
function getDefaultSwitchBlock( block ) {
  var device = block.device;
  var defaultIconOn=block.protoBlock.iconOn;
  var defaultIconOff=block.protoBlock.iconOff;
  var defaultIcon=block.protoBlock.icon;
  var defaultImageOn=block.protoBlock.imageOn;
  var defaultImageOff=block.protoBlock.imageOff;
  var defaultImage=block.protoBlock.image;
  var defaultTextOn=block.protoBlock.textOn;
  var defaultTextOff=block.protoBlock.textOff;
  var html = '';
  if (!isProtected(block)) {
    var confirmswitch = 0;
    if (typeof block !== 'undefined')
      if (typeof block['confirmation'] !== 'undefined') {
        confirmswitch = block['confirmation'];
      }
    var mMode = 'toggle';
    if (device['SwitchType'] == 'Push On Button') mMode = 'on';
    else if (device['SwitchType'] == 'Push Off Button') mMode = 'off';
    if (device.Type === 'Scene') mMode = 'on';
    if(!block.clickHandler)
    block.$mountPoint
      .find('.mh')
      .addClass('hover')
      .off('click')
      .click(function () {
        switchDevice(block, mMode, !!confirmswitch);
      });
  }
  block.defaultAddClass && block.$mountPoint.find('.mh').addClass(block.defaultAddClass);

  var textOn = defaultTextOn || language.switches.state_on;
  var textOff = defaultTextOff || language.switches.state_off;

  var attr = '';
  if (device['Image'] == 'Alarm') {
    defaultIconOff = 'fas fa-exclamation-triangle';
    defaultIconOn = defaultIconOff;
    if (device['Status'] == 'On') attr = 'style="color:#F05F40;"';
  }

  var iconLookup = {
    'on': defaultIconOn,
    'off': defaultIconOff,
    'mixed': defaultIconOff,
    'default': defaultIconOn || defaultIcon
  }
  var imageLookup = {
    'on': defaultImageOn,
    'off': defaultImageOff,
    'mixed': defaultImageOff,
    'default': defaultImageOn || defaultImage
  }
  var statusClass = getIconStatusClass(device['Status']);
  var mIcon = iconLookup[statusClass] || iconLookup.default || defaultIcon;
  var mImage = imageLookup[statusClass] || imageLookup.default || defaultImage;
  html += iconORimage(
    block,
    mIcon,
    mImage,
    statusClass + ' icon',
    attr
  );
  html += getBlockData(block, textOn, textOff);
  return html;
}

function isProtected(block) {
  return block.protected || (block.device && block.device.Protected);
}

function getIconStatusClass(deviceStatus) {
  if (deviceStatus != undefined) {
    switch (deviceStatus.toLowerCase()) {
      case 'off':
      case 'closed':
      case 'close':
      case 'normal':
      case 'unlocked':
      case 'no motion':
        return 'off';
      case 'mixed':
        return 'mixed';
    }
    return 'on';
  } else {
    return 'off';
  }
}

// eslint-disable-next-line no-unused-vars
function switchDevice(block, pMode, pAskConfirm) {
  /* Switch device
        params:
            cur : reference to DOM block 
            mode: "toggle", "on","off"
            confirm: boolean. Ask for confirmation first.
    */
  if (pAskConfirm === true && !confirm('Are you sure you want to switch?'))
    return;
  var idx = block.idx;
  var $div = block.$mountPoint;
  var dial = block.type === 'onoff';
  var group = block.type ==='group';
  if (isProtected(block)) return;

  var hasPassword = block.password;
  if (!DT_function.promptPassword(hasPassword)) return;
  var doStatus = '';
  var param = 'switchlight';
  if (!dial && !group) {
    switch (pMode) {
      case 'toggle':
        if (
          $div.find('.icon').hasClass('on') ||
          $div.find('.fa-toggle-on').length > 0
        ) {
          doStatus = toggleItem(block, 'on');
        } else {
          doStatus = toggleItem(block, 'off');
        }
        break;
      case 'on':
        doStatus = toggleItem(block, 'off');
        break;
      case 'off':
        doStatus = toggleItem(block, 'on');
        break;
      default:
        console.log('Incorrect mode in SwitchDevice for device ' + idx);
        return;
    }
  } else {
    doStatus = pMode;
  }

  if (DT_function.idxIsScene(idx)) {
    idx = idx.replace('s', '');
    param = 'switchscene';
  }

  Domoticz.request(
    'type=command&param=' +
    param +
    '&idx=' +
    idx +
    '&switchcmd=' +
    doStatus +
    '&level=0'
  ).then(function () {
    block.device.Status = doStatus;
    dial ? DT_dial.make(block) : getDevices(true);
  });
}

function toggleItem(block, currentState) {
  var $div = block.$mountPoint;
  var newState = '';
  if (currentState.toLowerCase() === 'off') {
    currentState = 'off';
    newState = 'on';
  } else {
    currentState = 'on';
    newState = 'off';
  }
  if ($div.find('.fa-toggle-' + currentState).length > 0) {
    $div
      .find('.fa-toggle-' + currentState)
      .addClass('fa-toggle-' + newState)
      .removeClass('fa-toggle-' + currentState);
  }

  $div.find('.icon').removeClass(currentState);
  $div.find('.icon').addClass(newState);
  $div.find('.state').html(language.switches['state_' + newState]);

  return newState.charAt(0).toUpperCase() + newState.slice(1);
}

// eslint-disable-next-line no-unused-vars
function switchBlinds(block, action) {
  var idx = block.idx;
  var hasPassword = block.password;
  if (!DT_function.promptPassword(hasPassword)) return;

  var $icondiv = block.$mountPoint.find('.mh').find('.icon');
  var src = $icondiv.attr('src');
  switch (action.toLowerCase()) {
    case 'off':
      $icondiv.removeClass('on').addClass('off');
      if (src) src.replace('open', 'closed');
      break;
    case 'on':
      $icondiv.removeClass('off').addClass('on');
      if (src) src.replace('closed', 'open');
      break;
  }

  Domoticz.request(
    'type=command&param=switchlight&idx=' +
    idx +
    '&switchcmd=' +
    action +
    '&level=0'
  ).then(function () {
    getDevices(true);
  });
}

function cmdSlideDevice(idx, level) {
  return 'type=command&param=switchlight&idx=' +
    idx +
    '&switchcmd=Set%20Level&level=' +
    level
}

function reqSlideDevice(idx, level) {
  return Domoticz.syncRequest(
    idx, cmdSlideDevice(idx, level)
  );
}

function reqSlideDeviceAsync(idx, level) {
  return Domoticz.request(cmdSlideDevice(idx, level));
}

// eslint-disable-next-line no-unused-vars
function slideDevice(block, status) {
  var $div = block.$mountPoint;
  $div.find('.icon').removeClass('off');
  $div.find('.icon').addClass('on');

  if ($div.find('.fa-toggle-off').length > 0) {
    $div
      .find('.fa-toggle-off')
      .addClass('fa-toggle-on')
      .removeClass('fa-toggle-off');
  }
  $div.find('.state').html(language.switches.state_on);

  reqSlideDevice(block.idx, status).then(function () {
    getDevices(true);
  });
}

/*
The following slider functions are used to set the slider while sliding.
On the first change an async request is send to Domoticz.
On succuueding changes first itś checked whether the previous request did finish.
If not, the new value is buffered, and will be send by sliderCallback after the previous request finished..
*/

var sliderAction = {
  state: 'idle',
  idx: 0,
  value: 0,
  request: 0,
};

function sliderSetValue(p_idx, p_value, p_Callback) {
  Domoticz.request(
    'type=command&param=switchlight&idx=' +
    p_idx +
    '&switchcmd=Set%20Level&level=' +
    p_value
  ).then(function () {
    p_Callback();
  });
}

function sliderCallback() {
  if (sliderAction.state == 'set') {
    //check whether we have to set another value
    sliderAction.request = sliderSetValue(
      sliderAction.idx,
      sliderAction.value,
      sliderCallback
    );
    sliderAction.state = 'idle';
  }
}

// eslint-disable-next-line no-unused-vars
function slideDeviceExt(block, value, sliderState) {
  //todo. Function not used?
  var $div = block.$mountPoint;
  if (sliderState == 0) {
    //start sliding
    $div.find('.icon').removeClass('off');
    $div.find('.icon').addClass('on');

    if ($div.find('.fa-toggle-off').length > 0) {
      $div
        .find('.fa-toggle-off')
        .addClass('fa-toggle-on')
        .removeClass('fa-toggle-off');
    }

    $div.find('.state').html(language.switches.state_on);

    sliderAction.request = sliderSetValue(block.idx, value, sliderCallback);
    return;
  }
  if (/*sliderState == 1 ||*/ sliderState == 2) {
    //change at the end. Temporarily (?) no update while sliding.
    if (sliderAction.request.readyState == 4) {
      sliderAction.request = sliderSetValue(block.idx, value, sliderCallback);
    } else {
      sliderAction.state = 'set';
      sliderAction.idx = block.idx;
      sliderAction.value = value;
    }
    return;
  }
}

// eslint-disable-next-line no-unused-vars
function ziggoRemote(key) {
  $.get(settings['switch_horizon'] + '?key=' + key);
}

// eslint-disable-next-line no-unused-vars
function controlLogitech(idx, action) {
  Domoticz.request(
    'type=command&param=lmsmediacommand&idx=' + idx + '&action=' + action
  ).then(function () {
    getDevices(true);
  });
}
var statusmsg = '';
// eslint-disable-next-line no-unused-vars
function switchSecurity(level, pincode) {
  pincode = md5(pincode);
  Domoticz.request(
    'type=command&param=setsecstatus&secstatus=' + level + '&seccode=' + pincode
  ).then(function (data) {
    if (data.status != 'OK') {
      statusmsg = data.message;
      if (statusmsg == 'WRONG CODE') statusmsg = language.misc.wrong_code;
      infoMessage('<font color="red">Alert!</font>', statusmsg, 10000);
    }
    getDevices(true);
  });
}

// eslint-disable-next-line no-unused-vars
function getDimmerBlock(block, buttonimg) {
  var device = block.device;
  var $div = block.$mountPoint.find('.mh');
  var html = '';
  var title = getBlockTitle(block);
  var classExtension = isProtected(block) ? ' icon' : ' icon iconslider'; //no pointer in case of protected device
  if (device['Status'] === 'Off')
    html += iconORimage(
      block,
      'far fa-lightbulb',
      buttonimg,
      getIconStatusClass(device['Status']) + classExtension,
      '',
      2,
      'data-light="' + device['idx'] + '" '
    );
  else
    html += iconORimage(
      block,
      'fas fa-lightbulb',
      buttonimg,
      getIconStatusClass(device['Status']) + classExtension,
      '',
      2,
      'data-light="' + device['idx'] + '" '
    );
  html += '<div class="col-xs-10 swiper-no-swiping col-data">';
  html += '<strong class="title">' + title;
  if (
    typeof block['hide_data'] == 'undefined' ||
    blocks['hide_data'] == false
  ) {
    html += ' ' + device['Level'] + '%';
  }
  html += '</strong>';
  if (showUpdateInformation(block)) {
    html +=
      ' &nbsp; <span class="lastupdate">' +
      moment(device['LastUpdate']).format(settings['timeformat']) +
      '</span>';
  }
  html += '<br />';
  html += '<div class="rgbcontainer">';
  if (isRGBDeviceAndEnabled(block)) html += '<div class="rgbholder"></div>';
  html +=
    '<div class="slider slider' +
    device['idx'] +
    '" data-light="' +
    device['idx'] +
    '"></div>';
  html += '</div>';
  html += '</div>';

  /* todo: Destroy not really needed
  var $rgbdiv = $div.find('.rgbw'); //This is the 'old' rgbdiv!

  if (isRGBDeviceAndEnabled(block) && $rgbdiv.spectrum) {
    //we have to manually destroy the previous spectrum color picker
    $rgbdiv.spectrum('destroy');
  }
*/
  $div.html(html);

  function dimmerClickHandler(block) {
    switchDevice(block, 'toggle', false);
  }

  $div.off('click');

  if (!isProtected(block)) {
    if(typeof block.switchMode==='string' && block.switchMode.toLowerCase()==='color') {
      //        me.$mountPoint.find('.extra').append('<div class="rgbholder"></div>');
      //        addColorpicker(me);
              var popupblock = {
                device: block.device,
                idx: block.idx,
                title: choose(block.title, block.key),
                colorpickerscale: block.colorpickerscale,
              }
              new Colorpicker({
                container: block.mountPoint + ' .mh',
                block: popupblock,
              });
            }
    else $div
      .on('click', function () {
        dimmerClickHandler(block);
      })
      .addClass('hover');
  }

  switch (isRGBDeviceAndEnabled(block)) {
    case 1:
      addSpectrum(block);
      break;
    case 2:
      addColorpicker(block);
      break;
    default:
      break;
  }

  var slider = {};
  switch (parseFloat(device['MaxDimLevel'])) {
    case 100:
      slider = {
        value: device['Level'],
        step: 1,
        min: 1,
        max: 100,
      };
      break;
    case 32:
      slider = {
        value: Math.ceil((device['Level'] / 100) * 32),
        step: 1,
        min: 2,
        max: 32,
      };
      break;
    default:
      slider = {
        value: Math.ceil((device['Level'] / 100) * 16),
        step: 1,
        min: 2,
        max: 15,
      };
      break;
  }
  slider.disabled = isProtected(block);
  addSlider(block, slider);

  return [html, false];
}

function addColorpicker(block) {
  var $rgbcontainer = block.$mountPoint.find('.rgbholder');
  var html = '';
  html +=
    '<div class="sp-replacer sp-light"><div class="sp-preview"><div class="sp-preview-inner"></div></div><div class="sp-dd">▼</div></div>';
  $rgbcontainer.html(html).addClass('cpholder');
  new Colorpicker({
    container: block.mountPoint + ' .rgbholder',
    block: block,
  });
}

function addSpectrum(block) {
  function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }
  
  function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }
  
  var idx = block.idx;
  var $rgbcontainer = block.$mountPoint.find('.rgbholder');
  var html = '';
  html +=
    '<input type="text" class="rgbw rgbw' + idx + '" data-light="' + idx + '">';
  $rgbcontainer.html(html).addClass('spectrum');
  var $rgbdiv = block.$mountPoint.find('.rgbw');
  var color = '#FFFFFF';
  if(block.device.Color ) {
    var deviceColor = JSON.parse(block.device.Color);
    if (deviceColor.r && (deviceColor.m==3 || deviceColor.m==4)) {
      color = rgbToHex(deviceColor.r, deviceColor.g, deviceColor.b);
    }
  }

  $rgbdiv.spectrum({
    color: color,
    appendTo: $rgbcontainer
  });

  $rgbdiv.on('dragstop.spectrum', function (e, color) {
    var hasPassword = block.password;
    if (!DT_function.promptPassword(hasPassword)) return;

    color = color.toHexString();
    spectrumColors[idx]=color;
    var hue = hexToHsb(color);
    var bIsWhite = hue.s < 20;

    //sliding = idx;
    Domoticz.hold(idx); //hold message queue

    var cmd = 'type=command&param=setcolbrightnessvalue&idx=' +
    idx +
    '&hue=' +
    hue.h +
    '&brightness=' +
    hue.b +
    '&iswhite=' +
    bIsWhite;
    Domoticz.request(cmd);

  });

  $rgbdiv.on('hide.spectrum', function () {
    //sliding = false;
    Domoticz.release(idx); //release message queue

    getDevices(true);
  });

  $rgbdiv.on('beforeShow.spectrum', function () {
    Domoticz.hold(idx); //hold message queue
    //sliding = idx;
  });
}

// eslint-disable-next-line no-unused-vars
function getBlindsBlock(parentBlock, withPercentageParam) {
  var block={};
  $.extend(block, parentBlock.protoBlock, parentBlock);
  var device = block.device;
  var withPercentage = choose(block.withPercentage, withPercentageParam, false);
  var idx = block.idx;
  var $mountPoint = block.$mountPoint.find('.mh');
  var html = '';

  var hidestop = false;
  var data_class = 'col-data blinds';
  var button_class;
  if (
    typeof block['hide_stop'] == 'undefined' ||
    block['hide_stop'] === false
  ) {
    data_class += ' right2col';
    button_class = 'col-button2';
  } else {
    hidestop = true;
    data_class += ' right1col';
    button_class = 'col-button1';
  }

  if (device['Status'] === 'Closed')
    html += iconORimage(block, '', 'blinds_closed.png', 'off icon', '', 2);
  else html += iconORimage(block, '', 'blinds_open.png', 'on icon', '', 2);
  html += '<div class="' + data_class + '">';
  var title = getBlockTitle(block);
  var value = '';
  if (withPercentage) {
    if (
      typeof block['hide_data'] == 'undefined' ||
      block['hide_data'] == false
    ) {
      title += ' ' + device['Level'] + '%';
    }
    value =
      '<div class="slider slider' +
      idx +
      '  swiper-no-swiping" data-light="' +
      idx +
      '"></div>';
  } else {
    if (device['Status'] === 'Closed')
      value =
        '<span class="state">' + (block.textOff || language.switches.state_closed) + '</span>';
    else
      value = '<span class="state">' + (block.textOn || language.switches.state_open) + '</span>';
  }
  if (!withPercentage) {
    if (
      typeof block['hide_data'] == 'undefined' ||
      blocks['hide_data'] == false
    ) {
      if (device['Status'] === 'Closed')
        value =
          '<span class="state">' + (block.textOff || language.switches.state_closed) + '</span>';
      else
        value =
          '<span class="state">' + (block.textOn || language.switches.state_open) + '</span>';
    } else {
      value = '<span class="state"></span>';
    }
  }
  html += '<strong class="title">' + title + '</strong><br />';
  html += value;
  html += '</div>';

  html += '<div class="' + button_class + '">';

  var asOn = Domoticz.info.newBlindsBehavior;

  if (device['SwitchType'].toLowerCase().indexOf('inverted') >= 0) {
    asOn = !asOn;
  }
  html +=
    '<div class="up"><a href="javascript:void(0)" class="btn btn-number plus">';
  html += '<em class="fas fa-chevron-up fa-small"></em>';
  html += '</a></div>';

  html +=
    '<div class="down"><a href="javascript:void(0)" class="btn btn-number min">';
  html += '<em class="fas fa-chevron-down fa-small"></em>';
  html += '</a></div>';

  if (!hidestop) {
    html +=
      '<div class="stop"><a href="javascript:void(0)" class="btn btn-number stop">';
    html += 'STOP';
    html += '</a></div>';
  }

  html += '</div>';

  $mountPoint.html(html);
  $mountPoint.find('.plus').click(function () {
    switchBlinds(block, asOn ? 'On' : 'Off');
  });
  $mountPoint.find('.min').click(function () {
    switchBlinds(block, asOn ? 'Off' : 'On');
  });
  $mountPoint.find('.btn.stop').click(function () {
    switchBlinds(block, 'Stop');
  });

  if (withPercentage) {
    addSlider(block, {
      value: device['Level'],
      step: 1,
      min: 1,
      max: 100,
      disabled: isProtected(block),
    });
  }
  return true;
}

/*previously there was a mechanism to send device update commands while sliding.
With the new websock interface the slider block didn't update correctly.
So I've disabled the call to slideDeviceExt function.
Maybe in the future I'll reenable the functionality.
*/
function addSlider(block, sliderValues) {
  var idx = block.idx;
  var $divslider = block.$mountPoint.find('.slider');

  $divslider.slider({
    value: sliderValues.value,
    step: sliderValues.step,
    min: sliderValues.min,
    max: sliderValues.max,
    disabled: sliderValues.disabled,
    start: function () {
      Domoticz.hold(idx); //hold message queue
      //sliding = idx;
      //            slideDeviceExt($(this).data('light'), ui.value, 0);
    },
    //        slide: function (event, ui) {
    //            slideDeviceExt($(this).data('light'), ui.value, 1);
    //},
    change: function (event, ui) {
      //            slideDeviceExt($(this).data('light'), ui.value, 2);
      var hasPassword = block.password;
      if (!DT_function.promptPassword(hasPassword)) return;

      slideDevice(block, ui.value);
    },
    stop: function () {
      //stop is called before change
      //sliding = false;
      Domoticz.release(idx); //release message queue
    },
  });
  $divslider.on('click', function (ev) {
    ev.stopPropagation();
  });
}

function isRGBDeviceAndEnabled(block) {
  if (Colorpicker.prototype.dimmerTypes.indexOf(block.device.SubType) === -1)
    return 0;
  if (typeof block.colorpicker !== 'undefined')
    return parseInt(block.colorpicker);
  if (typeof settings.colorpicker !== 'undefined')
    return parseInt(settings.colorpicker);
  return settings.no_rgb ? 0 : 1; //Default colorpicker is the old spectrum colorpicker
}

//# sourceURL=js/switches.js
