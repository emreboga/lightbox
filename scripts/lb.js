var LB = (function() {
    var lb = {};
    var flickrKey = 'd22ceeb31ddf3c037c6e5f88fa39a249';

    lb.imageUrls = [];

    lb.render = function(elmId) {
        getPhotos().then(function(response) {
            var photos = response.getElementsByTagName('photo');
            renderThumbnails(elmId, photos);
        }, logError);
    };

    function getPhotos() {
        var url = 'https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&photoset_id=72157626579923453&api_key=' + flickrKey;
        //var url = 'http://127.0.0.1:7777/mocks/flickr.xml';
        return makeXHttpRequest(url);
    }

    function renderThumbnails(elmId, data) {
        var elm = document.getElementById(elmId);
        if (typeof elm !== 'undefined' && elm !== null) {
            for (var i = 0, l = data.length; i < l; i++) {
                var photo = data[i];
                // construct the image url
                var photoUrl = buildPhotoUrl(photo);
                // create an anchor and a child image element for each image
                var imgAnchor = document.createElement('a');
                imgAnchor.innerHTML = '<img src="' + encodeURI(photoUrl) + '" alt="' + photo.getAttribute('title') + '">';
                // append each anchor to the container and listen to click event
                elm.appendChild(imgAnchor);
                imgAnchor.addEventListener('click', makeEventListener(i));
                // cache stardard resolution of the image to be used in lightbox view
                lb.imageUrls[i] = photoUrl;
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
            setupLightBox(e, idx);
        };
    }

    function setupLightBox(e, idx) {
        // prevent default click behavior to avoid the browser closing the overlay
        e.preventDefault();
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
            lightboxElm.style.display = 'none';
        });
        // add listener not to close the lightbox when clicked on the image
        imageElm.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    function setupNavigation() {
        // get prev and next elements and add click listeners for navigation
        var prevElm = document.getElementsByClassName('prev')[0];
        var nextElm = document.getElementsByClassName('next')[0];
        prevElm.addEventListener('click', prevImage);
        nextElm.addEventListener('click', nextImage);
        // add keydown listeners at document level to use arrow keys
        document.addEventListener('keydown', function(e) {
            e.preventDefault();
            switch (e.which) {
                case 37: // left
                    prevImage(e);
                    break;
                case 39: // right
                    nextImage(e);
                    break;
                default:
                    return;
            }
        });
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

    function setImage(imageElm, idx) {
        // set new image src and update next/prev indexes in data- attributes
        imageElm.src = encodeURI(lb.imageUrls[idx]);
        imageElm.dataset.prevImageIndex = idx === 0 ? lb.imageUrls.length - 1 : idx - 1;
        imageElm.dataset.nextImageIndex = idx === lb.imageUrls.length - 1 ? 0 : idx + 1;
    }

    // Our internal utility to make Xml Http requests
    // This function returns a 'promise' to be used by the caller
    function makeXHttpRequest(url) {
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
    }

    // log errors to console
    function logError(message) {
        console.log(message);
    }

    return lb;
}());
