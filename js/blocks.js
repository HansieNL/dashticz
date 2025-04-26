/* eslint-disable no-debugger */
/*global getBlockTypesBlock, language, settings*/
/*global Dashticz, DT_function, Domoticz, Debug */
/*global moment, number_format */
/*from bundle.js*/
/*global ion isDefined*/
/*from main.js*/
/*global toSlide disableStandby infoMessage*/
/*from dt_function.js*/
/* global capitalizeFirstLetter choose */
/*from switches.js*/
/*global  getIconStatusClass slideDevice*/
/*from custom.js*/
/*global afterGetDevices*/
/*unknown. probably a bug ...*/
/*global google*/
/*from config.js (or main.js)*/
/*global blocks*/
/* exported getSecurityBlock getMediaPlayer getSelectorSwitch*/

var alldevices = 'initial value';

var oldstates = [];
var onOffstates = [];

/**
 * Build all the blocks in a column.
 * @param {array} cols - Array containing all block definitions
 * @param {string | number} c - Column id
 * @param {string} screendiv - Screen div must contain row. Blocks will be mounted into
 * @param {boolean} standby - true if building standby screen
 *
 * Build all the blocks in a column
 */
// eslint-disable-next-line no-unused-vars
function getBlock(cols, c, screendiv, standby) {
  //    if (c==='bar') debugger;
  if (typeof cols !== 'undefined') {
    var columndiv = screendiv + ' .row .col' + c;
    var colclass = '';
    if (c === 'bar') colclass = 'transbg dark';
    var colwidth = 'col-sm-' + (cols.width ? cols.width + ' ' : '12 ');
    if (standby) {
      $(screendiv + ' .row').append(
        '<div class="' + colwidth + ' col-xs-12 col' + c + '"></div>'
      );
    } else {
      $(screendiv + ' .row').append(
        '<div data-colindex="' +
        c +
        '" class="' +
        colwidth +
        ' col-xs-12 sortable col' +
        c +
        ' ' +
        colclass +
        '"></div>'
      );
    }
    cols.blocks && cols['blocks'].forEach(function (b, i) {
      if (b)
        addBlock2Column(columndiv, c, b);
      else {
        Debug.log(Debug.ERROR, 'Block number ' + i + ' in column ' + c + ' is undefined.');
      }
    });
  }
}
/**Adds a block to a column
 * @param {string} columndiv - div to add block to
 * @param {string} c - Column id
 * @param {object | string | number} b - string, as key for block object, object or number
 *
 * If b is a number then it represents a device id.
 */
var previousblock = 0;

function addBlock2Column(columndiv, c, b) {
  if (typeof b === 'undefined') {
    console.log('Block undefined after block ', previousblock);
    return;
  }
  previousblock = b;
  var myblockselector = Dashticz.mountNewContainer(columndiv);
  var newBlock = b;
  if (typeof b !== 'object') newBlock = convertBlock(b, c);
  if (c === 'popup') newBlock.isPopup = true;
  if (newBlock.blocks) {
    newBlock.blocks.forEach(function (aBlock) {
      addBlock2Column(myblockselector, '', aBlock);
    });
    $(myblockselector).attr('data-id', newBlock.key);
    return;
  }
  if (Array.isArray(newBlock)) {
    newBlock.forEach(function (aBlock) {
      addBlock2Column(myblockselector, '', aBlock);
    });
    return;
  }

  if (!Dashticz.mount(myblockselector, newBlock))
    Dashticz.mountDefaultBlock(myblockselector, newBlock);
}

function convertBlock(blocktype, c) {
  var block = {};
  block.type = blocktype;
  $.extend(block, blocks[blocktype]);
  block.c = c; //c can be 'bar'. Used for sunriseholder
  block.key = block.key || blocktype;

  //Check for Domoticz device block
  if (isDomoticzDevice(block.type)) {
    block.width = (blocks[block.type] && blocks[block.type].width) || 4;
    block.idx = block.idx || block.type;
  }
  return block;
}

function getCustomFunction(functionname, block, afterupdate) {
  var functiondevname = functionname + '_' + block.key;
  //  console.log("calling "+functiondevname + " afterupdate: " + afterupdate);
  if (typeof window[functiondevname] === 'function') {
    try {
      if (functionname === 'getBlock') return window[functiondevname](block);

      window[functiondevname](block, afterupdate);
    } catch (err) {
      console.error('Error calling ' + functionname, err);
      var line = RegExp('(?::)(.*:.*)\\)').exec(err.stack)[1];
      infoMessage(
        'Error: ' + err.message,
        'Check function ' + functiondevname + ' in custom.js line ' + line,
        30000
      );
    }
  }
}

// eslint-disable-next-line no-unused-vars
function deviceUpdateHandler(block) {
  var selector = block.mountPoint;
  var idx = block.idx;
  var device = block.device;

  getCustomFunction('getStatus', block, false);
  var $selector = $(selector);
  if (typeof block.title === 'undefined') block.title = device.Name;

  //var $div=$selector.find('.block_'+fullidx); //doesn't work for blocks['myblock'] kind of definitions
  var $div = $selector.find('.mh');

  var width = 4;
  switch (device['SwitchType']) {
    case 'Selector':
      width = 8;
      break;
    case 'Dimmer':
      width = 12;
  }

  if (block) {
    if (
      $(window).width() < 768 &&
      typeof block['width_smartphone'] !== 'undefined'
    ) {
      width = block['width_smartphone'];
    } else if (typeof block['width'] !== 'undefined') {
      width = block['width'];
    }
  }

  $div.data('light', idx); //todo: don't use data('light') to store idx
  if (
    typeof settings['default_columns'] == 'undefined' ||
    parseFloat(settings['default_columns']) == 3
  )
    $div.addClass('col-xs-' + width);
  else if (parseFloat(settings['default_columns']) == 1)
    $div.addClass('col-xs-3');
  else if (parseFloat(settings['default_columns']) == 2)
    $div.addClass('col-xs-4');

  var html = '';

  triggerChange(block);

  html = getCustomFunction('getBlock', block);
  //getCustomFunction 'getBlock' returns undefined in case function getBlock_<idx> is not defined in custom.js
  if (!html) {
    html = handleDevice(block);
  }

  if (html && typeof html === 'string') {
    $div.html(html);
    getBlockClick(block);
  } else $div = $selector.find('.mh'); //$div may not exist anymore. Find the new one.

  if (typeof $div.attr('onclick') !== 'undefined') {
    $div.addClass('hover');
  }

  if ($div.hasClass('hover')) {
    $div.off('touchstart').on('touchstart', function () {
      var $this = $(this);
      $this.addClass('hovered');
      setTimeout(function () {
        $this.removeClass('hovered');
      }, 200);
    });
  }

  $div.removeClass('on off').addClass(function () {
    return getBlockClass(block);
  });
  var storedBlock = Dashticz.mountedBlocks[block.mountPoint];

  if (storedBlock && storedBlock.currentClass != block.addClass) {
    $div.removeClass(storedBlock.currentClass);
    storedBlock.currentClass = block.addClass;
  }
  block.defaultAddClass && $div.addClass(block.defaultAddClass);
  $div.addClass(block.addClass);
  if (storedBlock && storedBlock.currentDeviceStatus != device.deviceStatus) {
    $div.removeClass(storedBlock.currentDeviceStatus);
    storedBlock.currentDeviceStatus = device.deviceStatus;
  }
  $div.addClass(device.deviceStatus);

  if (device.HaveTimeout) $div.addClass('timeout');
  else $div.removeClass('timeout');

  addBatteryLevel($div, block);
  triggerStatus(block); //moved the second call to the end to assure that the block has been created in the DOM completely
}

/*add the battery level indicator*/
function addBatteryLevel($div, block) {
  var device = block.device;
  var $data = $div; //$div.find('.col-data');
  var batteryLevel = device.BatteryLevel;
  if (
    typeof batteryLevel === 'undefined' ||
    batteryLevel > block.batteryThreshold
  )
    return;
  var container = $data.find('.battery-level');
  var html =
    '<i class="battery-level ' +
    batteryLevelIcon(batteryLevel) +
    '"><div class="battery-percentage">' +
    batteryLevel +
    '</div></i>';
  if (!container.length) {
    $data.append(html);
  } else container.replace(html);
}

function batteryLevelIcon(level) {
  var icons = {
    'fas fa-battery-empty': 0,
    'fas fa-battery-quarter': 10,
    'fas fa-battery-half': 35,
    'fas fa-battery-three-quarters': 60,
    'fas fa-battery-full': 90,
  };
  var myLevel = typeof level !== 'undefined' ? level : 255;
  var myIcon = 'fas fa-battery-full';

  Object.keys(icons).forEach(function (key) {
    if (myLevel >= icons[key]) myIcon = key;
  });

  return myIcon;
}

function getBlockClass(block) {
  var addClass = getIconStatusClass(block.device['Status']);
  return addClass;
}

/** Checks whether key indicates a Domoticz device
 *
 * 4 situations:
 *
 *        '123': Normal Domoticz device id as string
 *        '123_1': subdevice 1
 *        's123': group or scene 123
 *        'v123': variable with idx 123
 *
 * @param {string} key - Key identifier to check
 */
function isDomoticzDevice(key) {
  if (typeof key === 'number') {
    return key;
  }
  var idx = parseInt(key);
  if (idx) {
    return idx;
  }
  if (typeof key === 'undefined') {
    //    debugger;
    return false;
  }
  if (key[0] === 's' || key[0] === 'v') {
    //scene, group or variable
    idx = parseInt(key.slice(1));
    if (idx) {
      return idx;
    }
  }
  return 0;
}

// eslint-disable-next-line no-unused-vars

function formatTemplateString(block, device, valueParam, isTitle) {
  // eslint-disable-next-line no-useless-escape
  var unit = block.unit;
  var format = block.format;
  var decimals = block.decimals;
  var tagRegEx = /<[\w\s="/.':;#-/?]+>/gi;
  var valueStr = Dashticz.getProperty(valueParam, device);
  var matches = valueStr.match(tagRegEx);
  var elements = [];

  //todo: see dirty hack below with '<br />'
  if (matches && matches[0] !== '<br />') {
    matches.forEach(function (val) {
      if (val !== '<br />') elements.push(val.replace(/([<,>])+/g, ''));
    });
  }
  /*    if (block.unit && typeof block.unit === 'string') {
            value+=' '+block.unit;
        }*/
  if (elements.length) {
    var blockunits = [];
    if (typeof unit === 'string') {
      blockunits = unit.split(';');
    }
    var cnt = 0;
    for (var d in elements) {
      var deviceValue = device[elements[d]];
      if (!isTitle && (format || typeof decimals !== 'undefined' || Dashticz.getProperty(unit, device))) {
        var blockunit = blockunits[cnt] || blockunits[0];
        var current_unit = '';
        if (isNaN(deviceValue)) {
          var valueSplit = deviceValue.split(' ');
          deviceValue = valueSplit[0];
          current_unit = valueSplit[1] || current_unit;
        }
        if (block.scale) {
          deviceValue = parseFloat(deviceValue) * block.scale;
        }
        if (format) {
          deviceValue = number_format(deviceValue, decimals);
        }
        deviceValue += blockunit || current_unit; //no space between value and unit
      }
      valueStr = valueStr.replace('<' + elements[d] + '>', deviceValue);
      cnt++;
    }
  } else {
    //not a template function
    //number_format has been applied already
    //so we only can change the unit, if needed.
    if (!isTitle && block.unit) {
      if (isNaN(valueStr)) {
        valueStr = valueStr.split(' ')[0] || valueStr;
      }
      valueStr += block.unit; //no space between value and unit
    }
  }

  return valueStr;
}
function formatBlockValues(parentBlock) {
  var blockValues = parentBlock.values;
//  var subidx=1;
  if(!blockValues) return;
  var newBlockValues = [];
  blockValues.forEach(function (block) {
//    $.extend(block, parentBlock);
    var newBlock = {};
    $.extend(newBlock, block);//, parentBlock); don't use parentBlock: it may contain icon from protoBlock
    //parentBlock may contain a custom icon
    //however, we should use value of block
    if(block.value) newBlock.value = block.value;
    if(block.subidx) newBlock.subidx = block.subidx;
    if(block.idx) newBlock.idx = block.idx;  //parentBlock has values with specific idx
//    if(!newBlock.subidx) newBlock.subidx=subidx;
//    subidx+=1;
//    idx = block.idx || parentBlock.idx;
    var device = Domoticz.getAllDevices(newBlock.idx);
    if (newBlock.hideEmpty && !device[newBlock.hideEmpty]) return;
    var value = Dashticz.getProperty(newBlock.value, device);
//    var title = block.title ? block.title : '';
    newBlock.value = formatTemplateString(block, device, ''+value);
    newBlock.title = formatTemplateString(block, device, newBlock.title || '', true);
    newBlockValues.push(newBlock);
  })
  return newBlockValues;
}

function getStatusBlock(block) {
  var device = block.device;
  var value = choose(block.value, '');
  var title = choose(block.title, '');
  var image = block.image;
  var icon = block.icon;

  if (block.subtitle) switch (block.showsubtitles) {
    case '2':
    case 2:
      value = value + ' (' + block.subtitle + ')'
      break;
    case 1:
    case '1':
    case true:
      title = title + ': ' + block.subtitle;
      break;
    case false:
    case 0:

  }

  if (!value && !title) {
    console.log('No title and no value for block');
    console.log(block);
  }

  //todo: this should not be part of blocks I guess. But we've reserved unit already for the 'real' unit for some devices
  /*    if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['unit']) !== 'undefined') {
            var unitArray = blocks[idx]['unit'].split(";");
            value = value.replace(unitArray[0], unitArray[1]);
        }*/

  getBlockClick(block, '.block_' + block.key);

  var attr = '';
  if (
    typeof device['Direction'] !== 'undefined' &&
    typeof device['DirectionStr'] !== 'undefined'
  ) {
    attr +=
      ' style="-webkit-transform: rotate(' +
      (device['Direction'] + 180) +
      'deg);-moz-transform: rotate(' +
      (device['Direction'] + 180) +
      'deg);-ms-transform: rotate(' +
      (device['Direction'] + 180) +
      'deg);-o-transform: rotate(' +
      (device['Direction'] + 180) +
      'deg); transform: rotate(' +
      (device['Direction'] + 180) +
      'deg);"';
    var windspeed = device.Data.split(';')[2] / 10;
    if (settings['use_beaufort'] == 1) {
      value = Beaufort(windspeed) + ', ';
    } else {
      value = windspeed + ' m/s, ';
    }
    value += device['Direction'] + '&deg ';
    if (settings['translate_windspeed'] == true) {
      value += TranslateDirection(device['DirectionStr']);
    } else {
      value += device['DirectionStr'];
    }
  }

  var stateBlock = '';
  if (typeof image !== 'undefined')
    stateBlock = iconORimage(block, '', image, 'icon', attr, 4, '');
  else stateBlock = iconORimage(block, icon, '', 'icon', attr, 4, '');

  stateBlock += '<div class="col-xs-8 col-data">';

  if (block.textOn && getIconStatusClass(device.Status) === 'on')
    value = block.textOn;
  if (block.textOff && getIconStatusClass(device.Status) === 'off')
    value = block.textOff;

  if (!titleAndValueSwitch(block)) {
    if (hideTitle(block)) {
      stateBlock += '<span class="value">' + value + '</span>';
    } else {
      stateBlock += '<strong class="title">' + title + '</strong><br />';
      stateBlock += '<span class="value">' + value + '</span>';
    }
  } else {
    if (hideTitle(block)) {
      stateBlock += '<strong class="title">' + value + '</strong>';
    } else {
      stateBlock += '<strong class="title">' + value + '</strong><br />';
      stateBlock += '<span class="value">' + title + '</span>';
    }
  }

  if (showUpdateInformation(block)) {
    stateBlock +=
      '<br /><span class="lastupdate">' +
      moment(device['LastUpdate']).format(settings['timeformat']) +
      '</span>';
  }
  stateBlock += '</div>';
  return stateBlock;
}

function getBlockClick(block, selector) {
  //set selector to set the clickhandler to a specific child instead of all .mh childs.
  //necessary for subdevices.
  var device = block.device;
  var url = block.url; //todo: undocumented feature
  var graph = block.graph;
  //var blockSel = '.block_'+ block.mountPoint.slice(1);
  //console.log('getBlockClick for ', block);
  //   var $div=blockdef.$mountPoint.find('.block_'+blockdef.idx);
  var $div = block.$mountPoint.find(
    typeof selector === 'undefined' ? '.mh' : selector
  );
  if (block.popup) {
    if ($div.length > 0) {
      $div
        .addClass('hover')
        .off('click')
        .click(function () {
          /*          if (target === '_blank') window.open(block.link);
          else if (target === 'iframe') addBlockClickFrame(block);*/
          DT_function.clickHandler({ block: block });
        });
    }
    return;
  }
  if (url) {
    if ($div.length > 0) {
      $div
        .addClass('hover')
        .off('click')
        .click(function () {
          /*          if (target === '_blank') window.open(block.link);
          else if (target === 'iframe') addBlockClickFrame(block);*/
          DT_function.clickHandler({ block: block });
        });
    }
  } else if (graph === false) {
    return;
  } else if (typeof device !== 'undefined') {
    if (
      device['SubType'] == 'Percentage' ||
      device['SubType'] == 'Custom Sensor' ||
      device['TypeImg'] == 'counter' ||
      device['Type'] == 'Temp' ||
      device['Type'] == 'Humidity' ||
      device['Type'] == 'Wind' ||
      device['Type'] == 'Rain' ||
      device['Type'] == 'Temp + Humidity' ||
      device['Type'] == 'Temp + Humidity + Baro' ||
      device['SubType'] == 'kWh' ||
      device['SubType'] === 'Lux' ||
      device['SubType'] === 'Solar Radiation' ||
      device['SubType'] === 'Barometer' ||
      device['SubType'] === 'Soil Moisture' ||
      graph
    ) {
      $div.addClass('hover').off('click').click(function () {
        DT_function.clickHandler({ block: block });
      });
    }
  }
}

// eslint-disable-next-line no-unused-vars
function addBlockClickFrame(block) {
  var idx = block.idx;
  var link = block.link;
  $('#button_' + idx).remove();
  var html =
    '<div class="modal fade" id="button_' +
    idx +
    '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
  html += '<div class="modal-dialog">';
  html += '<div class="modal-content">';
  html += '<div class="modal-header">';
  html +=
    '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
  html += '</div>';
  html += '<div class="modal-body">';
  html +=
    '<iframe src="' +
    link +
    '" width="100%" height="570" frameborder="0" allowtransparency="true"></iframe> ';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  $('body').append(html);
  $('#button_' + idx).modal('show');
}

/**
 * If defaultimage is given, default icon is ignored
 * @param idx
 * @param defaulticon
 * @param defaultimage
 * @param classnames
 * @param attr
 * @param colwidth
 * @param attrcol
 * @returns {string}
 */
function iconORimage(
  block,
  defaulticon,
  defaultimage,
  classnames,
  attr,
  colwidth,
  attrcol
) {
  var mIcon = defaulticon;
  var mImage = defaultimage;
  var useImage = false;
  //probably yes
  var device = block.device;
  if (defaultimage) {
    useImage = true;
  }
  var isOn = false;
  if (device && device.Status)
    isOn = getIconStatusClass(device.Status) === 'on';
  if (typeof block !== 'undefined') {
    if (typeof block['icon'] !== 'undefined') {
      mIcon = Dashticz.getProperty(block['icon'], device);
      useImage = false;
    }
    if (typeof block['image'] !== 'undefined') {
      mImage = Dashticz.getProperty(block['image'], device);
      useImage = true;
    }
  }
  var iconOn = mIcon;
  var iconOff = mIcon;
  var imageOn = mImage;
  var imageOff = mImage;

  if (typeof block !== 'undefined') {
    if (typeof block['iconOn'] !== 'undefined') {
      iconOn = block['iconOn'];
      if (isOn) useImage = false;
    }
    if (typeof block['iconOff'] !== 'undefined') {
      iconOff = block['iconOff'];
      if (!isOn) useImage = false;
    }
    if (typeof block['imageOn'] !== 'undefined') {
      imageOn = block['imageOn'];
      if (isOn) useImage = true;
    }
    if (typeof block['imageOff'] !== 'undefined') {
      imageOff = block['imageOff'];
      if (!isOn) useImage = true;
    }
  }

  mIcon = isOn ? iconOn : iconOff;
  mImage = isOn ? imageOn : imageOff;

  if (typeof colwidth === 'undefined') colwidth = 4;
  if (typeof attrcol === 'undefined') attrcol = '';
  if (typeof attr === 'undefined') attr = '';
  var icon = '<div class="col-xs-' + colwidth + ' col-icon" ' + attrcol + '>';
  if (useImage) {
    icon +=
      '<img src="img/' +
      mImage +
      '" class="' +
      classnames +
      '" ' +
      attr +
      ' />';
  } else {
    icon += '<em class="' + mIcon + ' ' + classnames + '" ' + attr + '></em>';
  }

  icon += '</div>';
  return icon;
}

// eslint-disable-next-line no-unused-vars
function getBlockData(block, textOn, textOff) {
  // this.title = device['Name']; // should be the other way around:
  var title = getBlockTitle(block); //but probably this was set earlier already ...
  var opendiv = '<div class="col-xs-8 col-data">';
  var closediv = '</div>';

  var data = '';

  if (!block['hide_data']) {
    var value = choose(block.textOn, textOn);
    var status = block.device.Status.toLowerCase();
    if (
      status == 'off' ||
      status == 'closed' ||
      status == 'normal' ||
      status == 'locked' ||
      status == 'no motion' ||
      (status == '' && block.device['InternalState'] == 'off')
    ) {
      value = choose(block.textOff, textOff);
    }
    if (status === 'mixed') {
      value = choose(block.textmixed, language.switches.state_mixed || 'Mixed');
    }

    if (titleAndValueSwitch(block)) {
      title = value;
      value = getBlockTitle(block);
    }

    data = '<br /><span class="state">' + value + '</span>';
  }
  data = '<strong class="title">' + title + '</strong>' + data; //Attach data part behind title

  if (showUpdateInformation(block)) {
    data +=
      '<br /><span class="lastupdate">' +
      moment(block.device['LastUpdate']).format(settings['timeformat']) +
      '</span>';
  }

  return opendiv + data + closediv;
}

function titleAndValueSwitch(block) {
  return block.switch;
}

function hideTitle(block) {
  if (block.hide_title) return true;
  var title = getBlockTitle(block);
  return (title === 0 || title === '');
}

function showUpdateInformation(block) {
  return (
    (settings['last_update'] &&
      (typeof block['last_update'] === 'undefined' || block['last_update'])) ||
    (!settings['last_update'] &&
      typeof block['last_update'] !== 'undefined' &&
      block['last_update'])
  );
}

function TranslateDirection(directionstr) {
  directionstr = 'direction_' + directionstr;
  return language['wind'][directionstr];
}

/**
 * Calculate windspeed in meters per second to Beaufort
 * @param windSpeed in m/s
 * @returns number Wind speed in Bft
 */

function toBeaufort(windSpeed) {
  windSpeed = Math.abs(windSpeed);
  if (windSpeed <= 0.2) {
    return 0;
  }
  if (windSpeed <= 1.5) {
    return 1;
  }
  if (windSpeed <= 3.3) {
    return 2;
  }
  if (windSpeed <= 5.4) {
    return 3;
  }
  if (windSpeed <= 7.9) {
    return 4;
  }
  if (windSpeed <= 10.7) {
    return 5;
  }
  if (windSpeed <= 13.8) {
    return 6;
  }
  if (windSpeed <= 17.1) {
    return 7;
  }
  if (windSpeed <= 20.7) {
    return 8;
  }
  if (windSpeed <= 24.4) {
    return 9;
  }
  if (windSpeed <= 28.4) {
    return 10;
  }
  if (windSpeed <= 32.6) {
    return 11;
  }
  return 12;
}

/**
 * Calculate windspeed in meters per second to Beaufort
 * @param windSpeed in m/s
 * @returns string Wind speed in Bft
 */
function Beaufort(windSpeed) {
  return toBeaufort(windSpeed) + ' Bft';

}

function triggerStatus(block) {
  var idx = block.idx;
  var device = block.device;
  var value = device.LastUpdate;
  getCustomFunction('getStatus', block, true);

  if (typeof onOffstates[idx] !== 'undefined' && value !== onOffstates[idx]) {
    onOffHandling(block, getIconStatusClass(device['Status']));
  }
  onOffstates[idx] = value;
}

/*
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
*/

function onOffHandling(block, status) {
  var _status = capitalizeFirstLetter(status);
  if (block['playsound' + _status]) {
    playAudio(block['playsound' + _status]);
  }
  if (block['speak' + _status]) {
    speak(block['speak' + _status]);
  }
  if (block['message' + _status]) {
    infoDevicsSwitch(block['message' + _status]);
  }
  if (block['gotoslide' + _status]) {
    toSlide(block['gotoslide' + _status] - 1);
    disableStandby();
  }
  if (block['openpopup' + _status]) {
    DT_function.clickHandler(block, block['openpopup' + _status]);
  }
}

// eslint-disable-next-line no-unused-vars
function triggerChange(block) {
  var idx = block.mountPoint;
  var device = block.device;
  var value = device.LastUpdate;
  var $div = block.$mountPoint.find('.mh');

  if (typeof oldstates[idx] !== 'undefined' && value !== oldstates[idx]) {
    //disableStandby();
    getCustomFunction('getChange', block, true);

    if (block['flash']) {
      var flash_value = block['flash'];
      if (flash_value > 0) {
        $div
          .stop()
          .addClass('blockchange', flash_value)
          .removeClass('blockchange', flash_value);
      }
    }

    onOffHandling(block, '');
  }
  oldstates[idx] = value;
}

function setDefaultImage(block) {
  var deviceImages = {
    'Fan': 'fan.png',
    'Heating': 'heating.png',
  }
  var defaultImage;
  if(block && block.device && block.device.Image)
    defaultImage = deviceImages[block.device.Image];
  if(defaultImage && !block.image)
    block.image = defaultImage;
}

function handleDevice(block) {
  setDefaultImage(block);
  block.protoBlock = getBlockTypesBlock(block);
  if(block.values && !block.single_line && !block.joinsubblocks) {
    block.multi_line = choose(block.multi_line, true);
  }
  var handler = choose(block.handler, block.protoBlock.handler);
  if (handler) {
    return handler(block);
  }

  createBlocks(block);
}

/*exported postHookLogitechMediaServer */
function postHookLogitechMediaServer(block) {
  var device = block.device;
  var html = '';
  html += '<div>';
  html +=
    '<a href="javascript:controlLogitech(' +
    device['idx'] +
    ',\'Rewind\');"><em class="fas fa-arrow-circle-left fa-small"></em></a> ';
  html +=
    '<a href="javascript:controlLogitech(' +
    device['idx'] +
    ',\'Stop\');"><em class="fas fa-stop-circle fa-small"></em></a> ';
  if (device['Status'] === 'Playing') {
    html +=
      '<a href="javascript:controlLogitech(' +
      device['idx'] +
      ',\'Pause\');"><em class="fas fa-pause-circle fa-small"></em></a> ';
  } else {
    html +=
      '<a href="javascript:controlLogitech(' +
      device['idx'] +
      ',\'Play\');"><em class="fas fa-play-circle fa-small"></em></a> ';
  }
  html +=
    '<a href="javascript:controlLogitech(' +
    device['idx'] +
    ',\'Forward\');"><em class="fas fa-arrow-circle-right fa-small"></em></a>';
  html += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
  html +=
    '<a href="javascript:controlLogitech(' +
    device['idx'] +
    ',\'VolumeDown\');"><em class="fas fa-minus-circle fa-small"></em></a>';
  html += '&nbsp;';
  html +=
    '<a href="javascript:controlLogitech(' +
    device['idx'] +
    ',\'VolumeUp\');"><em class="fas fa-plus-circle fa-small"></em></a>';
  html += '</div>';
  html += '</div>';
  block.$mountPoint.find('.col-data').append(html);
}

function getJoinValuesSeperator(block) {
  if (typeof block.joinsubblocks === 'string') return block.joinsubblocks;
  if (block.single_line) return '/ ';
  if (block.multi_line) return '<br/>';
}

function selectBlockValues(parentBlock) {
  var blockValues = parentBlock.values;
  if(!blockValues) return;
  if (parentBlock.showvalues) { //showvalues contains a list of subidx devices to show
    var selectedBlockValues = [];
    parentBlock.showvalues.forEach(function (value) {
      var obj = blockValues[value - 1];
      if (typeof obj === 'object') selectedBlockValues.push(obj)
    });
    blockValues = selectedBlockValues;
  }
  var filteredBlockValues = blockValues.filter(function (blockValue) {
    return !(blockValue.hideEmpty && !isDefined(parentBlock.device[blockValue.hideEmpty]))
  });

  var seperator = getJoinValuesSeperator(parentBlock);
  if (seperator) {
    var value = filteredBlockValues.map(function (blockValue) {
      var localValue = blockValue.value;
      var showsubtitles = choose(parentBlock.showsubtitles, blockValue.showsubtitles);
      if (blockValue.subtitle) {
        if(showsubtitles===2)
          return localValue + ' (' + blockValue.subtitle+')';
        if(showsubtitles)
          return blockValue.subtitle + ': ' + localValue;
        return localValue;
      }
      else return localValue;
    }).join(seperator);
    parentBlock.value = value;
    return; //values must become undefined
  }
  return filteredBlockValues;
}

function createBlocks(origBlock) {
  /* I assume this function gets called once per block
  // That means we first have to remove the previous content
  // console.log('createBlocks for '+blockParent.idx);
  //
  */

  //Four situations:
  // 1. block.values (protoBlock.value and protoBlock.values will be ignored)
  // 2. block.value (block.values and protoBlock.values will be ignored)
  // 3. protoBlock.values
  // 4. protoBlock.value


  var protoBlock = origBlock.protoBlock;
  var block = {};

  //default should be like this:
  $.extend(block, protoBlock, origBlock); 
  //Note: protoBlock may contain an icon, while protoBlock.values also contain icons.
  //Protoblock.values.icons have priority
  //while origBlock.icon has priority above protoblock.values.icons
  //So I think protoBlock.values should be extended with origBlock to get the icon right.
  //Note: if origBlock contains a value parameter it will overwrite all values.value
  //That is ok

  if (protoBlock.values && !origBlock.values) {
    block.values = protoBlock.values.map(function (value) {
      var newValue = {};
      $.extend(newValue, value, origBlock);
      return newValue;
    });
  }


  //if protoBlock has values, then these values already have been extended with protoblock in blocktypes.js
  //however, this is not the case for values of origBlock:
  if (origBlock.values) {
    var subidx = 1;
    block.values = origBlock.values.map(function (value) {
      var newValue = { subidx: subidx };
      $.extend(newValue, protoBlock, origBlock, value);
      subidx += 1;
      return newValue;
    });
  }
  //the code above also is correct when origBlock uses values with different idx

  //the idea is that at this moment block.values is always correct, and has been expanded.
  if (origBlock.subidx && block.values) {
    var newBlock={};
    $.extend(newBlock, origBlock, block.values[origBlock.subidx-1]); //added origBlock, to keep $mountPoint
    newBlock.values = undefined;
    //if block.subidx exists then don't look at block.values anymore!
    block=newBlock;
  }

  //Now handle all cases when value has been defined.
  //protoBlock, inluding value, already has been extended into protoBlock.values, so that should be ok.
  //In case origBlock contains value, and origBlock doesn't contain values, then remove values
  //because protoBlock may contain values which shall be overruled by origBlock.value
  if(origBlock.value && !origBlock.values) block.values = undefined;

  var device = Domoticz.getAllDevices(block.idx);
  block.device=device;
  if (block.value) block.value = formatTemplateString(block, device, block.value); //there should always be a block.value
  if (block.title) block.title = formatTemplateString(block, device, block.title, true);
  block.values = formatBlockValues(block);
  block.values = selectBlockValues(block);
  block.$mountPoint.html(''); //it would be better for performance to add all changes at once.

  var blockValues = block.values;
  if (blockValues)
    blockValues.forEach(function (blockValue) {
      createSingleBlock(blockValue, false, true);
    });
  else
    createSingleBlock(block, block.multi_line || block.single_line, false);
  var postHook = protoBlock.postHook;
  if (postHook)
    postHook(block);
}

function createSingleBlock(block, asMultiLine, hasSubidx) {
  if(Dashticz.getProperty(block.hidden, block.device)) return;
  var key = block.key;
  if (hasSubidx) {
    key += '_' + block.subidx;
    block.key=key;
    $.extend(block, blocks[key]);
  }
  var multiline = asMultiLine ? ' multiline' : '';
  var html =
    '<div data-id="' + key + '" class="mh transbg block_' +
    key + multiline +
    ' col-xs-' +
    (block.width || 4) +
    '"/>';
  block.$mountPoint.append(html);

  triggerStatus(block);
  triggerChange(block);

  html = getStatusBlock(block);

  block.$mountPoint
    .find('[data-id="' + key + '"]')
    .html(html)
    .addClass(block.addClass)
    .addClass(block.defaultAddClass);
}

// eslint-disable-next-line no-unused-vars
function loadMaps(b, map) {
  if (typeof map.link !== 'undefined') {
    map['url'] = map.link;
    $('body').append(
      DT_function.createModalDialog('', 'trafficmap_frame_' + b, map)
    );
  }

  var key = 'UNKNOWN';
  if (typeof map.key !== 'undefined') key = map.key;

  var width = 12;
  if (typeof map.width !== 'undefined') width = map.width;
  var html = '';
  if (typeof map.link !== 'undefined')
    html =
      '<div class="col-xs-' +
      width +
      ' mh hover swiper-no-swiping transbg block_trafficmap" data-toggle="modal" data-target="#trafficmap_frame_' +
      b +
      '" onclick="setSrc(this);" ';
  else
    html =
      '<div class="col-xs-' +
      width +
      ' mh swiper-no-swiping transbg block_trafficmap" ';
  if (typeof map.height !== 'undefined')
    html += ' style="height:' + map.height + 'px !important;"';
  html += '>';
  html +=
    '<div id="trafficmap_' +
    b +
    '" data-id="maps.' +
    key +
    '" class="trafficmap"></div>';
  html += '</div>';
  setTimeout(function () {
    showMap('trafficmap_' + b, map);
  }, 1000);
  return html;
}

// eslint-disable-next-line no-unused-vars
function getAllDevicesHandler(value) {
  //    debugger;
  //    console.log('alldevices update');
  alldevices = Domoticz.getAllDevices();
  $('.solar').remove();
  if ($('.sunrise').length > 0) {
    $('.sunrise').html(alldevices['_Sunrise']);
  }
  if ($('.sunset').length > 0) $('.sunset').html(alldevices['_Sunset']);

  $('div.newblocks.plugins').html('');
  $('div.newblocks.domoticz').html('');

  if (typeof afterGetDevices === 'function') afterGetDevices();
}

// eslint-disable-next-line no-unused-vars
function getDevices(override) {
  Domoticz.update();
}

function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob(str)));
}

function infoDevicsSwitch(msg) {
  $('body').append(
    '<div class="update">&nbsp;&nbsp;' + msg + '&nbsp;&nbsp;</div>'
  );
  setTimeout(function () {
    $('.update').fadeOut();
  }, 10000);
}

function speak(textToSpeak) {
  var newUtterance = new SpeechSynthesisUtterance();
  newUtterance.text = textToSpeak;
  newUtterance.lang = settings['speak_lang'];
  window.speechSynthesis.speak(newUtterance);
}

function playAudio(file) {
  //    var key = md5(file);
  file = file.split('/');

  var filename = file[file.length - 1].split('.');
  filename = filename[0];
  delete file[file.length - 1];

  ion.sound({
    sounds: [
      {
        name: filename,
      },
    ],

    path: file.join('/') + '/',
    preload: true,
    multiplay: false,
  });

  ion.sound.play(filename);
}

/*Todo: make map a regular block*/
// eslint-disable-next-line no-unused-vars
function initMap() {
  if ($('#trafficm').length > 0) {
    showMap('trafficm');
    setInterval(function () {
      showMap('trafficm');
    }, 60000 * 5);
  }
}

function showMap(mapid, map) {
  if (
    typeof settings['gm_api'] == 'undefined' ||
    settings['gm_api'] == '' ||
    settings['gm_api'] == 0
  ) {
    console.log('Please, set Google Maps API KEY!');
    infoMessage('Info:', 'Please, set Google Maps API KEY!', 8000);
    return;
  }
  if (typeof map !== 'undefined') {
    map = new google.maps.Map(document.getElementById(mapid), {
      zoom: map.zoom,
      center: {
        lat: map.latitude,
        lng: map.longitude,
      },
    });
  } else {
    map = new google.maps.Map(document.getElementById(mapid), {
      zoom: parseFloat(settings['gm_zoomlevel']),
      center: {
        lat: parseFloat(settings['gm_latitude']),
        lng: parseFloat(settings['gm_longitude']),
      },
    });
  }

  var transitLayer = new google.maps.TrafficLayer();
  transitLayer.setMap(map);
}

function getSecurityBlock(block) {
  //todo: rewrite

  var device = block.device;
  if (block.protected || device.Protected)
    return getProtectedSecurityBlock(block);
  var html = '';
  if (device['Status'] === 'Normal')
    html += iconORimage(block, 'fas fa-shield-alt', '', 'off icon', '', 2);
  else html += iconORimage(block, 'fas fa-shield-alt', '', 'on icon', '', 2);

  var secPanelicons =
    settings['security_button_icons'] === true ||
      settings['security_button_icons'] === 1 ||
      settings['security_button_icons'] === '1'
      ? true
      : false;
  var da = 'default';
  var ah = 'default';
  var aa = 'default';
  var disarm = language.switches.state_disarm;
  var armhome = language.switches.state_armhome;
  var armaway = language.switches.state_armaway;

  if (secPanelicons === true) {
    disarm =
      '<i class="fas fa-unlock" title="' +
      language.switches.state_disarm +
      '"></i>';
    armhome =
      '<i class="fas fa-home" title="' +
      language.switches.state_armhome +
      '"></i>';
    armaway =
      '<i class="fas fa-home" title="' +
      language.switches.state_armaway +
      '"></i><i class="fa fa-walking"></i>';
  }
  if (device['Status'] === 'Normal') {
    da = 'warning';
    if (secPanelicons === false) disarm = language.switches.state_disarmed;
    else
      disarm =
        '<i class="fas fa-unlock" title="' +
        language.switches.state_disarmed +
        '"></i>';
  }
  if (device['Status'] === 'Arm Home') {
    ah = 'danger';
    if (secPanelicons === false) armhome = language.switches.state_armedhome;
    else
      armhome =
        '<i class="fas fa-home" title="' +
        language.switches.state_armedhome +
        '"></i>';
  }
  if (device['Status'] === 'Arm Away') {
    aa = 'danger';
    if (secPanelicons === false) armaway = language.switches.state_armedaway;
    else
      armaway =
        '<i class="fas fa-home" title="' +
        language.switches.state_armaway +
        '"></i><i class="fas fa-walking"></i>';
  }
  if (device['Type'] === 'Security') {
    html += '<div class="col-xs-8 col-data" style="width: calc(100% - 50px);">';
    html += '<strong class="title">' + block.title + '</strong><br />';
    html += '<div class="btn-group" data-toggle="buttons">';
    html += '<label class="btn btn-' + da + '" onclick="enterCode(0)">';
    html +=
      '<input type="radio" name="options" autocomplete="off" value="Normal" checked>' +
      disarm;
    html += '</label>';
    html += '<label class="btn btn-' + ah + '" onclick="enterCode(1)">';
    html +=
      '<input type="radio" name="options" autocomplete="off" value="Arm Home" checked>' +
      armhome;
    html += '</label>';
    html += '<label class="btn btn-' + aa + '" onclick="enterCode(2)">';
    html +=
      '<input type="radio" name="options" autocomplete="off" value="Arm Away" checked>' +
      armaway;
    html += '</label>';
    html += '</div>';
    html += '</div>';
  }
  return [html, true];
}

function getProtectedSecurityBlock(block) {
  var defaultSettings = {
    Normal: {
      iconOff: 'fas fa-shield-alt',
    },
    Alarm: {
      imageOn: 'alarm.png',
    },
    'Arm Home': {
      icon: 'fas fa-home',
    },
    'Arm Away': {
      icon: 'fas fa-walking',
    },
  };

  var secBlock = defaultSettings[block.device.Status] || {
    icon: 'fas fa-shield-alt',
  };
  secBlock.value = block.device.Status;
  $.extend(secBlock, block);
  return [getStatusBlock(secBlock), true];
}

function getBlockTitle(block) {
  return choose(block.title, block.protoBlock && block.protoBlock.title, block.device && block.device.Name);
}

function getMediaPlayer(block) {
  var html = '';
  var device = block.device;
  if (device['HardwareType'] == 'Kodi Media Server')
    html += iconORimage(block, '', 'kodi.png', 'on icon', '', 2);
  else html += iconORimage(block, 'fas fa-film', '', 'on icon', '', 2);
  html += '<div class="col-xs-10 col-data">';
  html += '<strong class="title">' + block.title + '</strong><br />';
  if (device['Data'] === '') {
    device['Data'] = language.misc.mediaplayer_nothing_playing;
    if (settings['hide_mediaplayer'] == 1)
      $('div.block_' + block.key).hide();
  } else {
    $('div.block_' + block.key).show();
  }
  html += '<span class="value h4">' + device['Data'] + '</span>';
  return html;
}

function getSelectorSwitch(block) {
  var device = block.device;
  var html = '';
  var nameValues;
  if (
    typeof device['LevelActions'] !== 'undefined' &&
    device['LevelNames'] !== ''
  ) {
    var names = Domoticz.info.levelNamesEncoded ? b64_to_utf8(device['LevelNames']) : device['LevelNames'];

    nameValues = names.split('|').map(function (name, idx) {
      return {
        name: name,
        value: idx
      }
    })

    if (block.sortOrder) {
      nameValues.sort(function (a, b) {
        return a.name.localeCompare(b.name) * block.sortOrder;
      })
    }

    if (device['Status'] === 'Off')
      html += iconORimage(
        block,
        'far fa-lightbulb',
        block.image,
        getIconStatusClass(device['Status']) + ' icon'
      );
    else
      html += iconORimage(
        block,
        'fas fa-lightbulb',
        block.image,
        getIconStatusClass(device['Status']) + ' icon'
      );

    if (
      typeof device['SelectorStyle'] !== 'undefined' &&
      device['SelectorStyle'] == 1
    ) {
      html += '<div class="col-xs-8 col-data">';
      if (!hideTitle(block)) html += '<strong class="title">' + block.title + '</strong><br />';
      html += '<select>';
      html += '<option value="">' + language.misc.select + '</option>';
      for (var idx in nameValues) {
        var nv = nameValues[idx];
        if (
          parseFloat(nv.value) > 0 ||
          (nv.value == 0 &&
            (typeof device['LevelOffHidden'] == 'undefined' ||
              device['LevelOffHidden'] === false))
        ) {
          var s = '';
          if (nv.value * 10 == parseFloat(device['Level'])) s = 'selected';
          html +=
            '<option value="' +
            nv.value * 10 +
            '" ' +
            s +
            '>' +
            nv.name +
            '</option>';
        }
      }
      html += '</select>';
      html += '</div>';
      block.$mountPoint
        .find('.mh')
        .off('change')
        .on('change', 'select', function () {
          slideDevice(block, $(this).val());
        });
    } else {
      html += '<div class="col-xs-8 col-data">';
      if (!hideTitle(block)) html += '<strong class="title">' + block.title + '</strong><br />';
      html += '<div class="btn-group" data-toggle="buttons">';
      for (idx in nameValues) {
        nv = nameValues[idx];
        if (
          parseFloat(nv.value) > 0 ||
          (nv.value == 0 &&
            (typeof device['LevelOffHidden'] == 'undefined' ||
              device['LevelOffHidden'] === false))
        ) {
          var st = '';
          if (nv.value * 10 == parseFloat(device['Level'])) st = 'active';
          html += '<label class="btn btn-default ' + st + '">';
          html +=
            '<input type="radio" name="options" autocomplete="off" value="' +
            nv.value * 10 +
            '" checked>' +
            nv.name;
          html += '</label>';
        }
      }
      html += '</select>';
      html += '</div>';
      html += '</div>';
      block.$mountPoint
        .find('.mh')
        .off('click')
        .on('click', '.btn-group', function (ev) {
          var value = $(ev.target).children('input').val();
          slideDevice(block, value);
        });
    }
  }
  return html;
}
//# sourceURL=js/blocks.js
