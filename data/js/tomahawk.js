/* === This file is part of Tomahawk Player - <http://tomahawk-player.org> ===
 *
 *   Copyright 2011,      Dominik Schmidt <domme@tomahawk-player.org>
 *   Copyright 2011-2012, Leo Franchi <lfranchi@kde.org>
 *   Copyright 2011,      Thierry Goeckel
 *   Copyright 2013,      Teo Mrnjavac <teo@kde.org>
 *   Copyright 2013-2014, Uwe L. Korn <uwelk@xhochy.com>
 *   Copyright 2014,      Enno Gottschalk <mrmaffen@googlemail.com>
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 */

// if run in phantomjs add fake Tomahawk environment
if ((typeof Tomahawk === "undefined") || (Tomahawk === null)) {
    var Tomahawk = {
        fakeEnv: function () {
            return true;
        },
        resolverData: function () {
            return {
                scriptPath: function () {
                    return "/home/tomahawk/resolver.js";
                }
            };
        },
        log: function () {
            console.log.apply(arguments);
        }
    };
}

Tomahawk.apiVersion = "0.2.2";



Tomahawk.dumpResult = function (result) {
    var results = result.results;
    Tomahawk.log("Dumping " + results.length + " results for query " + result.qid + "...");
    for (var i = 0; i < results.length; i++) {
        Tomahawk.log(results[i].artist + " - " + results[i].track + " | " + results[i].url);
    }

    Tomahawk.log("Done.");
};


// help functions

Tomahawk.valueForSubNode = function (node, tag) {
    if (node === undefined) {
        throw new Error("Tomahawk.valueForSubnode: node is undefined!");
    }

    var element = node.getElementsByTagName(tag)[0];
    if (element === undefined) {
        return undefined;
    }

    return element.textContent;
};


/**
 * Internal counter used to identify retrievedMetadata call back from native
 * code.
 */
Tomahawk.retrieveMetadataIdCounter = 0;
/**
 * Internal map used to map metadataIds to the respective JavaScript callbacks.
 */
Tomahawk.retrieveMetadataCallbacks = {};

/**
 * Retrieve metadata for a media stream.
 *
 * @param url String The URL which should be scanned for metadata.
 * @param mimetype String The mimetype of the stream, e.g. application/ogg
 * @param sizehint Size in bytes if not supplied possibly the whole file needs
 *          to be downloaded
 * @param options Object Map to specify various parameters related to the media
 *          URL. This includes:
 *          * headers: Object of HTTP(S) headers that should be set on doing the
 *                     request.
 *          * method: String HTTP verb to be used (default: GET)
 *          * username: Username when using authentication
 *          * password: Password when using authentication
 * @param callback Function(Object,String) This function is called on completeion.
 *          If an error occured, error is set to the corresponding message else
 *          null.
 */
Tomahawk.retrieveMetadata = function (url, mimetype, sizehint, options, callback) {
    var metadataId = Tomahawk.retrieveMetadataIdCounter;
    Tomahawk.retrieveMetadataIdCounter++;
    Tomahawk.retrieveMetadataCallbacks[metadataId] = callback;
    Tomahawk.nativeRetrieveMetadata(metadataId, url, mimetype, sizehint, options);
};

/**
 * Pass the natively retrieved metadata back to the JavaScript callback.
 *
 * Internal use only!
 */
Tomahawk.retrievedMetadata = function (metadataId, metadata, error) {
    // Check that we have a matching callback stored.
    if (!Tomahawk.retrieveMetadataCallbacks.hasOwnProperty(metadataId)) {
        return;
    }

    // Call the real callback
    if (Tomahawk.retrieveMetadataCallbacks.hasOwnProperty(metadataId)) {
        Tomahawk.retrieveMetadataCallbacks[metadataId](metadata, error);
    }

    // Callback are only used once.
    delete Tomahawk.retrieveMetadataCallbacks[metadataId];
};

/**
 * Internal counter used to identify asyncRequest callback from native code.
 */
Tomahawk.asyncRequestIdCounter = 0;
/**
 * Internal map used to map asyncRequestIds to the respective javascript
 * callback functions.
 */
Tomahawk.asyncRequestCallbacks = {};

/**
 * Pass the natively retrieved reply back to the javascript callback
 * and augment the fake XMLHttpRequest object.
 *
 * Internal use only!
 */
Tomahawk.nativeAsyncRequestDone = function (reqId, xhr) {
    // Check that we have a matching callback stored.
    if (!Tomahawk.asyncRequestCallbacks.hasOwnProperty(reqId)) {
        return;
    }

    // Call the real callback
    if (xhr.readyState == 4 && httpSuccessStatuses.indexOf(xhr.status) != -1) {
        // Call the real callback
        if (Tomahawk.asyncRequestCallbacks[reqId].callback) {
            Tomahawk.asyncRequestCallbacks[reqId].callback(xhr);
        }
    } else if (xhr.readyState === 4) {
        Tomahawk.log("Failed to do nativeAsyncRequest");
        Tomahawk.log("Status Code was: " + xhr.status);
        if (Tomahawk.asyncRequestCallbacks[reqId].errorHandler) {
            Tomahawk.asyncRequestCallbacks[reqId].errorHandler(xhr);
        }
    }

    // Callbacks are only used once.
    delete Tomahawk.asyncRequestCallbacks[reqId];
};



Tomahawk.assert = function (assertion, message) {
    Tomahawk.nativeAssert(assertion, message);
};

Tomahawk.sha256 = Tomahawk.sha256 || function (message) {
        return CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
    };
Tomahawk.md5 = Tomahawk.md5 || function (message) {
        return CryptoJS.MD5(message).toString(CryptoJS.enc.Hex);
    };
// Return a HMAC (md5) signature of the input text with the desired key
Tomahawk.hmac = function (key, message) {
    return CryptoJS.HmacMD5(message, key).toString(CryptoJS.enc.Hex);
};

Tomahawk.localStorage = Tomahawk.localStorage || {
        setItem: function (key, value) {
            window.localStorage[key] = value;
        },
        getItem: function (key) {
            return window.localStorage[key];
        },
        removeItem: function (key) {
            delete window.localStorage[key];
        }
    };

// some aliases
Tomahawk.setTimeout = Tomahawk.setTimeout || window.setTimeout;
Tomahawk.setInterval = Tomahawk.setInterval || window.setInterval;
Tomahawk.base64Decode = function (a) {
    return window.atob(a);
};
Tomahawk.base64Encode = function (b) {
    return window.btoa(b);
};

Tomahawk.NativeScriptJobManager = {
    idCounter: 0,
    deferreds: {},
    invoke: function (methodName, params) {
        var requestId = this.idCounter++;
        Tomahawk.invokeNativeScriptJob(requestId, methodName, JSON.stringify(params));
        this.deferreds[requestId] = RSVP.defer();
        return this.deferreds[requestId].promise;
    },
    reportNativeScriptJobResult: function (requestId, result) {
        var deferred = this.deferreds[requestId];
        if (!deferred) {
            Tomahawk.log("Deferred object with the given requestId is not present!");
        }
        deferred.resolve(result);
    }
};
