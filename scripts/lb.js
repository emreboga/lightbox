// An abstraction layer for Light Box
var LightBox = (function() {
    var imageUrls = [];
    var apiKey, elmId;

    function LightBox(options) {
        apiKey = options.apiKey;
        elmId = options.containerId;
    }

    LightBox.prototype.render = function() {
        var photoSet = new FlickrPhotoSet({
            'callback': setupLightBox,
            'apiKey': apiKey,
            'photoSetId': '72157626579923453'
        });
        photoSet.render(elmId);
    };

    function setupLightBox(images, e, idx) {
        // prevent default click behavior to avoid the browser closing the overlay
        e.preventDefault();
        // set image urls to be used in navigation
        imageUrls = images;
        // setting up the lightbox has two steps:
        // 1- display the overlay
        // 2- add listeners for navigation
        displayLigthBox(idx);
        setupNavigation();
    }

    function displayLigthBox(idx) {
        var lightboxElm = document.getElementsByClassName('lightbox')[0];
        var imageElm = document.getElementsByClassName('picture')[0];
        // display lightbox container
        lightboxElm.style.display = 'block';
        // set clicked image to display as first
        setImage(imageElm, idx);
        // add listener to close the lightbox when clicked outside
        lightboxElm.addEventListener('click', function() {
            closeLightbox(lightboxElm);
        });
        // add listener not to close the lightbox when clicked on the image
        imageElm.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    function closeLightbox(elm) {
        var lightboxElm = elm || document.getElementsByClassName('lightbox')[0];
        if (typeof lightboxElm !== 'undefined' && lightboxElm !== null) {
            // close the lightbox
            lightboxElm.style.display = 'none';
            // remove keydown listeners at document level when closing the lightbox
            document.removeEventListener('keydown', navigateKeydown);
        }
    }

    function setupNavigation() {
        // get prev and next elements and add click listeners for navigation
        var prevElm = document.getElementsByClassName('prev')[0];
        var nextElm = document.getElementsByClassName('next')[0];
        prevElm.addEventListener('click', prevImage);
        nextElm.addEventListener('click', nextImage);
        // add keydown listeners at document level to use arrow keys
        document.addEventListener('keydown', navigateKeydown);
    }

    function prevImage(e) {
        // stop propagation not to close the lightbox when clicked on prev
        e.stopPropagation();
        navigate(false/*next*/);
    }

    function nextImage(e) {
        // stop propagation not to close the lightbox when clicked on next
        e.stopPropagation();
        navigate(true/*next*/);
    }

    function navigate(next) {
        // set the new image from the next or previous index
        var imageElm = document.getElementsByClassName('picture')[0];
        var idx = next ? imageElm.dataset.nextImageIndex : imageElm.dataset.prevImageIndex;
        setImage(imageElm, parseInt(idx));
    }

    function navigateKeydown(e) {
        e.preventDefault();
        switch (e.which) {
            case 37: // left
                prevImage(e);
                break;
            case 39: // right
                nextImage(e);
                break;
            case 27: // escape
                closeLightbox(null);
                break;
            default:
                return;
        }
    }

    function setImage(imageElm, idx) {
        // set new image src and update next/prev indexes in data- attributes
        imageElm.src = encodeURI(imageUrls[idx]);
        imageElm.dataset.prevImageIndex = idx === 0 ? imageUrls.length - 1 : idx - 1;
        imageElm.dataset.nextImageIndex = idx === imageUrls.length - 1 ? 0 : idx + 1;
    }

    return LightBox;
}());

// An abstraction layer for Flickr Photo Set
var FlickrPhotoSet = (function() {
    var restUrl = 'https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos';
    var imageUrls = [];
    var lightboxDelegate, apiKey, photoSetId;

    // constructor
    // data: photo set as xml node
    // callback: handler to call back when an image is clicked
    function FlickrPhotoSet(options) {
        lightboxDelegate = options.callback;
        apiKey = options.apiKey;
        photoSetId = options.photoSetId;
    }

    // public render function for a FlickrPhotoSet instance
    // elmId: element Id where to render the photo set
    FlickrPhotoSet.prototype.render = function(elmId) {
        getPhotos().then(function(response) {
            var photos = response.getElementsByTagName('photo');
            renderGallery(elmId, photos);
        }, Utility.logError);
    };

    // calls Flicker service to retrieve photos
    // when a query parameter 'mockupData=1' is specified, mockup data in the testserver/mocks/flickr.xml is returned
    function getPhotos() {
        var url = restUrl + '&photoset_id=' + photoSetId + '&api_key=' + apiKey;
        if (Utility.getQueryParams().mockupData === '1') {
            url = 'http://127.0.0.1:7777/mocks/flickr.xml';
        }
        return Utility.makeXHttpRequest(url);
    }

    // renders the photo set as a gallery witin the specified element
    function renderGallery(elmId, photos) {
        var elm = document.getElementById(elmId);
        if (typeof elm !== 'undefined' && elm !== null) {
            for (var i = 0, l = photos.length; i < l; i++) {
                var photo = photos[i];
                // construct the image url
                var photoUrl = buildPhotoUrl(photo);
                // create an anchor and a child image element for each image
                var imgAnchor = document.createElement('a');
                imgAnchor.title = photo.getAttribute('title');
                imgAnchor.innerHTML = '<img src="' + encodeURI(photoUrl) + '">';
                // append each anchor to the container and listen to click event
                elm.appendChild(imgAnchor);
                imgAnchor.addEventListener('click', makeEventListener(i));
                // cache stardard resolution of the image to be used in lightbox view
                imageUrls[i] = photoUrl;
            }
        }
    }

    // builds the photo url from the flickr photo element
    function buildPhotoUrl(photo) {
        // default image
        var url = 'images/no_image.svg';
        // attributes required to build the flickr image url
        var farm = photo.getAttribute('farm');
        var server = photo.getAttribute('server');
        var id = photo.getAttribute('id');
        var secret = photo.getAttribute('secret');
        // only build when all attributes available
        if (farm && server && id && secret) {
            url = 'http://farm' + farm + '.static.flickr.com/' + server + '/' + id + '_' + secret + '_' + 't.jpg';
        }
        return url;
    }

    // returns a click event listener with the idx parameter stored used its scope
    // this is one way to use the image specific index without using any global collection
    function makeEventListener(idx) {
        return function(e) {
            lightboxDelegate(imageUrls, e, idx);
        };
    }

    return FlickrPhotoSet;
}());

// Common utility functions
var Utility = (function() {
    var utils = {};

    // Our internal utility to make Xml Http requests
    // This function returns a 'promise' to be used by the caller
    utils.makeXHttpRequest = function(url) {
        var promise = new Promise(function(resolve, reject) {
            var request = new XMLHttpRequest();
            if (typeof request !== 'undefined' && request !== null) {
                request.onreadystatechange = function() {
                    if (request.readyState === 4) {
                        if (request.status === 200) {
                            var response = request.responseXML;
                            resolve(response);
                        } else {
                            reject();
                        }
                    }
                };
                request.open('GET', url);
                request.send();
            } else {
                reject();
            }
        });

        return promise;
    };

    // returns a hash of query parameters and values
    utils.getQueryParams = function() {
        var params = {};
        var keyValuePairs = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for (var i = 0, l = keyValuePairs.length; i < l; i++) {
            var pair = keyValuePairs[i].split('=');
            params[pair[0]] = pair[1];
        }
        return params;
    };

    // log errors to console
    utils.logError = function(message) {
        console.log(message);
    };

    return utils;
}());
