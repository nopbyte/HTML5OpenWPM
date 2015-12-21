// Wrap in a function closure to hide variables
(function () {

// Bypass the Jetpack DOM wrapper
let(window = unsafeWindow) {

// Header guard workaround for Jetpack multiple script loading bug
if(typeof window.navigator.instrumented == "undefined") {
Object.defineProperty(window.navigator, "instrumented", { get: function() { return true; }});

// Debugging

// Default is off, to enable include in your script
Object.defineProperty(window.navigator, "instrumented_debugging", { get: function() { return true; }});
function debugging() { return window.navigator.instrumentation_debugging; }

// Debugging tool - last accessed variable
var last_accessed = "";
Object.defineProperty(window.navigator, "last_accessed", { get: function() { return last_accessed; }});

/*
 * Instrumentation helpers
 */

// Recursively generates a path for an element
function getPathToDomElement(element) {
    if(element == document.body)
        return element.tagName;
    if(element.parentNode == null)
        return 'NULL/' + element.tagName;

    var siblingIndex = 1;
    var siblings = element.parentNode.childNodes;
    for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];
        if (sibling == element) {
            var path = getPathToDomElement(element.parentNode);
            path += '/' + element.tagName + '[' + siblingIndex;
            path += ',' + element.id;
            path += ',' + element.className;
            if(element.tagName == 'A')
                    path += ',' + element.href;
            path += ']';
            return path;
        }
        if (sibling.nodeType == 1 && sibling.tagName == element.tagName)
            siblingIndex++;
    }
}

// Helper for JSONifying objects
function serializeObject(object) {
	
    // Handle permissions errors
    try {
        if(object == null)
            return "null";
        if(typeof object == "function")
            return "FUNCTION";
        if(typeof object != "object")
            return object;
        var seenObjects = [];
        return JSON.stringify(object, function(key, value) {
            if(value == null)
                return "null";
            if(typeof value == "function")
                return "FUNCTION";
            if(typeof value == "object") {
                // Remove wrapping on content objects
                if("wrappedJSObject" in value) {
                    value = value.wrappedJSObject;
                }
                
                // Serialize DOM elements
                if(value instanceof HTMLElement)
                    return getPathToDomElement(value);

                // Prevent serialization cycles
                if(key == "" || seenObjects.indexOf(value) < 0) {
                    seenObjects.push(value);
                    return value;
                }
                else
                    return typeof value;
            }
            return value;
        });
    }
    catch(error) {
        console.log("SERIALIZATION ERROR: " + error);
        return "SERIALIZATION ERROR: " + error;
    }
}

function logErrorToConsole(error) {
    console.log("Error name: " + error.name);
    console.log("Error message: " + error.message);
    console.log("Error filename: " + error.fileName);
    console.log("Error line number: " + error.lineNumber);
    console.log("Error stack: " + error.stack);
}

// Helper to get originating script urls
var geckoCallSiteRe = /^\s*(.*?)(?:\((.*?)\))?@?((?:file|https?|chrome):.*?)(?: line \d* > eval)?:(\d+)(?::(\d+))?\s*$/i;
function getStackTrace() {
  var stack;

  try {
    throw new Error();
  } catch (err) {
    stack = err.stack;
  }

  return stack;
}
function getOriginatingScriptUrl() {
  var trace = getStackTrace().split('\n');

  if (trace.length < 4) {
    return '';
  }

  // this script is at 0, 1 and 2
  var callSite = trace[3];

  var scriptUrlMatches = callSite.match(geckoCallSiteRe);
  return scriptUrlMatches && scriptUrlMatches[3] || '';
}

// Prevent logging of gets arising from logging
var inLog = false;

// For gets, sets, etc. on a single value
function logValue(instrumentedVariableName, value, operation, scriptUrl) {
    if(inLog)
            return;
    inLog = true;
    try {
        self.port.emit("instrumentation", {
            operation: operation,
            symbol: instrumentedVariableName,
            value: serializeObject(value),
            scriptUrl: scriptUrl
        });
    }
    catch(error) {
        console.log("Unsuccessful value log!");
        logErrorToConsole(error);
    }
    inLog = false;
}

// For functions
function logCall(instrumentedFunctionName, args, scriptUrl) {
    if(inLog)
        return;
    inLog = true;
    try {	
        // Convert special arguments array to a standard array for JSONifying
        var serialArgs = [ ];
        for(var i = 0; i < args.length; i++)
            serialArgs.push(serializeObject(args[i]));
        self.port.emit("instrumentation", {
            operation: "call",
            symbol: instrumentedFunctionName,
            args: serialArgs,
            value: "",
            scriptUrl: scriptUrl
        });
    }
    catch(error) {
        console.log("Unsuccessful call log: " + instrumentedFunctionName);
        logErrorToConsole(error);
    }
    inLog = false;
}

// Rough implementations of Object.getPropertyDescriptor and Object.getPropertyNames
// See http://wiki.ecmascript.org/doku.php?id=harmony:extended_object_api
Object.getPropertyDescriptor = function (subject, name) {
    var pd = Object.getOwnPropertyDescriptor(subject, name);
    var proto = Object.getPrototypeOf(subject);
    while (pd === undefined && proto !== null) {
        pd = Object.getOwnPropertyDescriptor(proto, name);
        proto = Object.getPrototypeOf(proto);
    }
    return pd;
};

Object.getPropertyNames = function (subject, name) {
    var props = Object.getOwnPropertyNames(subject);
    var proto = Object.getPrototypeOf(subject);
    while (proto !== null) {
        props = props.concat(Object.getOwnPropertyNames(proto));
        proto = Object.getPrototypeOf(proto);
    }
    // FIXME: remove duplicate property names from props
    return props;
};

/*
 *  Direct instrumentation of javascript objects
 */

// Use for direct objects
function instrumentObject(object, objectName, excludedProperties=[]) {
    var properties = Object.getPropertyNames(object);
    for (var i = 0; i < properties.length; i++) {
        if (excludedProperties.indexOf(properties[i]) > -1) {
            continue;
        }
        instrumentObjectProperty(object, objectName, properties[i]);
    }
}
        
function instrumentObjectProperty(object, objectName, propertyName) {
    try {
        var property = object[propertyName];
        if (typeof property == 'function') {
            logFunction(object, objectName, propertyName);
        } else {
            logProperty(object, objectName, propertyName);
        }
    } catch(err) {
        //console.log(err);
    }
}

// Use for prototypes of Objects
function instrumentPrototype(object, objectName, excludedProperties=[]) {
    var properties = Object.getPropertyNames(object);
    for (var i = 0; i < properties.length; i++) {
        if (excludedProperties.indexOf(properties[i]) > -1) {
            continue;
        }
        instrumentPrototypeProperty(object, objectName, properties[i]);
    }
}

function instrumentPrototypeProperty(object, objectName, propertyName) {
    try {
        var property = object[propertyName];
        if (typeof property == 'function') {
            logFunction(object, objectName, propertyName);
        }
    } catch(err) {
        logPropertyPrototype(object, objectName, propertyName);
    }
}

// Log calls to methods
function logFunction(object, objectName, method) {
  var originalMethod = object[method];
  object[method] = function () {
    var scriptUrl = getOriginatingScriptUrl();
    logCall(objectName + '.' + method, arguments, scriptUrl);
    return originalMethod.apply(this, arguments);
  };
}

// Logging for properties of prototype objects
var instrumentedData = {};
function logPropertyPrototype(object, objectName, property) {
    instrumentedData[objectName + property] = undefined;
    Object.defineProperty(object, property, {
        configurable: true,
        get: function() {
            var scriptUrl = getOriginatingScriptUrl();
            logValue(objectName + '.' + property, instrumentedData[objectName + property], "get", scriptUrl);
            return instrumentedData[objectName + property];
        },
        set: function(value) {
            var scriptUrl = getOriginatingScriptUrl();
            logValue(objectName + '.' + property, value, "set", scriptUrl);
            instrumentedData[objectName + property] = value;
        }
    });
}

// Logging properties of objects
function logProperty(object, objectName, property) {
    var originalProperty = object[property];
    Object.defineProperty(object, property, {
        configurable: true,
        get: function() {
            var scriptUrl = getOriginatingScriptUrl();
            logValue(objectName + '.' + property, originalProperty, "get", scriptUrl);
            return originalProperty;
        },
        set: function(value) {
            var scriptUrl = getOriginatingScriptUrl();
            logValue(objectName + '.' + property, value, "set", scriptUrl);
            originalProperty = value;
        }
    });
}

/*
 * Start Instrumentation
 */

// Access to navigator properties
var navigatorProperties = [ "appCodeName", "appMinorVersion", "appName", "appVersion", "buildID", "cookieEnabled", "cpuClass", "doNotTrack", "geolocation", "language", "languages", "onLine", "opsProfile", "oscpu", "platform", "product", "productSub", "systemLanguage", "userAgent", "userLanguage", "userProfile", "vendorSub", "vendor" ];
navigatorProperties.forEach(function(property) {
    instrumentObjectProperty(window.navigator, "window.navigator", property);
});

// Access to screen properties
//instrumentObject(window.screen, "window.screen");
var screenProperties =  [ "pixelDepth", "colorDepth" ];
screenProperties.forEach(function(property) {
    instrumentObjectProperty(window.screen, "window.screen", property);
});

// Access to plugins
for (var i = 0; i < window.navigator.plugins.length; i++) {
    instrumentObject(window.navigator.plugins[i], "window.navigator.plugins[" + i + "]");
}

// Name, localStorage, and sessionsStorage logging
// Instrumenting window.localStorage directly doesn't seem to work, so the Storage 
// prototype must be instrumented instead. Unfortunately this fails to differentiate 
// between sessionStorage and localStorage. Instead, you'll have to look for a sequence 
// of a get for the localStorage object followed by a getItem/setItem for the Storage object.
windowProperties = [ "name", "localStorage", "sessionStorage" ];
windowProperties.forEach(function(property) {
    instrumentObjectProperty(window, "window", property);
});
instrumentPrototype(window.Storage.prototype, "window.Storage")

// Access to canvas
instrumentPrototype(window.HTMLCanvasElement.prototype,"HTMLCanvasElement");
var excludedProperties = [ "quadraticCurveTo", "lineTo", "transform", "globalAlpha", "moveTo", "drawImage" ];
instrumentPrototype(window.CanvasRenderingContext2D.prototype, "CanvasRenderingContext2D", excludedProperties);

// Access to webRTC
instrumentPrototype(window.mozRTCPeerConnection.prototype,"mozRTCPeerConnection");

}

}

})();
