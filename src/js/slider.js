"use strict";

/**
 * Creates a new Slider.
 * @constructor
 * @description A basic slider in vanilla JavaScript and SASS
 * @param {!object} selector
 * @param {?object} args
 * @param {number} [args.rate=0.5] - The time in seconds for the slide it takes to slide.
 * @param {number} [args.autoSlide=false] - When 1, turns auto slide mode on. Otherwise this functionality is off.
 * @param {number} [args.delayBetweenSlides=5000} - Delay between slides in milliseconds.
 * @author Johan Meester <walter.doodah@gmail.com>
 * @licence MIT - http://opensource.org/licenses/MIT
 * @copyright Johan Meester 2017
 */
((root) => {
  const DOC = root.document;

  function Slider(selector, args) {
    const slider = DOC.querySelector(selector);

    const autoSlide = (args.autoSlide === 1);
    const delayBetweenSlides = args.delayBetweenSlides || 5000;
    const rate = args.rate || 0.5;

    let autoSlideManualOverride = false;
    let autoSlideTimerId = 0;
    let buttonNext = null;
    let buttonPrevious = null;
    let controlsPresent = false;
    let frame = null;
    let frameWidth = 0;
    let maxVisibleSlides = 0;
    let newMargin = 0;
    let numberOfSlides = 0;
    let offset = 0;
    let slides = null;
    let slidedSlidesCount = 0;
    let slideList = null;
    let slideWidth = 0;
    let slidingBusy = false;
    let spareSlidesCount = 0;
    let started = false;
    let touchStartPositionX = 0;
    let touchEndPositionX = 0;

    /**
     * @function slideOneSlide
     * @param {!number} newPosition - The new position to slide to.
     * @param {!number} delay - Delay in seconds before the animation starts.
     */
    function slideOneSlide(newPosition, delay) {
      slides.style.transform = 'translateZ(0)';
      slides.style.webkitTransition = `margin ${rate}s linear ${delay}s`;
      slides.style.transition = `margin ${rate}s linear ${delay}s`;

      slidingBusy = true;
      slides.style.marginLeft = `${newPosition}px`;
    }

    /** @function rewind - Sets the slider back into the starting position */
    function rewind() {
      if (slidingBusy) return;

      slidedSlidesCount = 0;
      slideOneSlide(0, 0);
    }

    /**
     * @function slide
     * @param {!string} direction - Direction to slide to, either 'left' or 'right'.
     * @param {number} [delay=0] - Delay in seconds before the animation starts.
     */
    function slide(direction, delay = 0) {
      if (slidingBusy) return;
      if (autoSlideTimerId) clearTimeout(autoSlideTimerId);

      newMargin = 0;

      if (direction === 'left' && slidedSlidesCount < spareSlidesCount) {
        if (slidedSlidesCount) {
          newMargin = (slideWidth * slidedSlidesCount * -1) - slideWidth;
          // newMargin += offset;
        } else {
          newMargin = slideWidth * -1;
        }

        ++slidedSlidesCount;
      } else if (direction === 'right' && slidedSlidesCount > 0) {
        newMargin = (slideWidth * slidedSlidesCount * -1) + slideWidth;
        --slidedSlidesCount;
      } else {
        return;
      }

      slideOneSlide(newMargin, delay);
    }

    const prefix = ['webkit', ''];

    /**
     * @function PrefixedEvent
     * @param {object} element - The DOM element to add the event listener to
     * @param {string} type - The type of the event
     * @param {object} callback - A callback function
     * See {@link https://www.sitepoint.com/css3-animation-javascript-event-handlers/ How to Capture CSS3 Animation Events in JavaScript}.
     */
    function PrefixedEvent(element, type, callback) {
      for (let p = 0; p < prefix.length; p++) {
        if (!prefix[p]) {
          type.toLowerCase();
        }
        element.addEventListener(prefix[p] + type, callback, false);
      }
    }

    /**
     * @function updateButtonState.
     * @description Updates the visible cues to the left- and right button to indicate to the user that the end or start
     * position is reached.
     */
    function updateButtonState() {
      if (!buttonPrevious && !buttonNext) {
        return;
      }

      if (slidedSlidesCount >= spareSlidesCount) {
        buttonNext.classList.add('c-slider__button--disabled');
      } else {
        buttonNext.classList.remove('c-slider__button--disabled');
      }

      if (slidedSlidesCount <= 0) {
        buttonPrevious.classList.add('c-slider__button--disabled');
      } else {
        buttonPrevious.classList.remove('c-slider__button--disabled');
      }
    }

    /** @function startAutoSlide - Starts sliding automatically */
    function startAutoSlide() {
      autoSlideTimerId = root.setTimeout(() => {
        if (slidedSlidesCount < spareSlidesCount) {
          slide('left');
        } else {
          rewind();
        }
      }, delayBetweenSlides);
    }

    /**
     * @callback handleAnimationEvents - Handler for CSS animation events.
     * @param {object} ev - The event object.
     * @listens document:transitionend
     */
    function handleAnimationEvents(ev) {
      const eventType = ev.type.toLowerCase();

      /**
       * When the animation has ended:
       * update the number of slided slides,
       * remove the animation related styles so we can trigger the animation again,
       * update the left and right button state,
       * set slidingBusy state to false.
       */
      if (eventType === 'transitionend') {
        if (slidedSlidesCount) {
          slides.style.marginLeft = `${newMargin}px`;
        } else {
          slides.style.marginLeft = 0;
        }

        [
          'webkitTransition',
          'transition',
          'transform'
        ].forEach(property => {
          slides.style.removeProperty(property);
        });

        updateButtonState();

        slidingBusy = false;

        if (autoSlide && !autoSlideManualOverride) startAutoSlide();
      }
    }

    /**
     * @callback handleTouchEvents - Handler for touch events
     * @param {!object} ev
     * @listens frame:touchstart
     * @listens frame:touchend
     * @listens frame:touchcancel
     * @listens frame:touchend
     */
    function handleTouchEvents(ev) {
      if (ev.type === 'touchcancel' || ev.type === 'touchend') {
        ev.preventDefault();
        if (touchEndPositionX < touchStartPositionX - (slideWidth / 2)) {
          slide('left');
        } else if (touchEndPositionX > touchStartPositionX + (slideWidth / 2)) {
          slide('right');
        }
      }

      // Only for one touch
      if (ev.touches.length === 1) {
        switch (ev.type) {
          case 'touchstart':
            autoSlideManualOverride = true;
            touchStartPositionX = ev.touches[0].clientX;
            break;
          case 'touchmove':
            ev.preventDefault(); // Prevent scrolling
            touchEndPositionX = ev.changedTouches[0].clientX;
            break;
          default:
            break;
        }
      }
    }

    /** @function calculate - Calculate the values for: maxVisibleSlides, spareSlidesCount and offset */
    function calculate() {
      try {
        slider.style.removeProperty('max-width');
        slideWidth = parseInt(root.getComputedStyle(slideList[0]).width, 10);
        frameWidth = parseInt(root.getComputedStyle(frame).width, 10);

        maxVisibleSlides = Math.floor(frameWidth / slideWidth);
        spareSlidesCount = Math.floor(numberOfSlides - maxVisibleSlides);

        // We do not want to show partially visible slides, so we adjust the with of the slider downwards
        offset = frameWidth % slideWidth;

        if (offset) {
          frameWidth -= offset;
          let totalButtonsWidth = 0;

          if (controlsPresent) {
            totalButtonsWidth = parseInt(root.getComputedStyle(buttonPrevious).width, 10) * 2;
          }

          slider.style.maxWidth = `${frameWidth + totalButtonsWidth}px`;
        }

        // Make all slides the same height based on the highest slide
        for (let i = 0, l = slideList.length; i < l; i++) {
          slideList[i].style.removeProperty('height');
        }

        const heights = [];

        // MS Edge does not support forEach on NodeList
        for (let i = 0, l = slideList.length; i < l; i++) {
          heights.push(parseInt(root.getComputedStyle(slideList[i]).height, 10));
        }

        const minHeight = Math.min.apply(Math, heights);
        const maxHeight = Math.max.apply(Math, heights);

        if (minHeight !== maxHeight) {
          for (let i = 0, l = slideList.length; i < l; i++) {
            slideList[i].style.height = `${maxHeight}px`;
          }
        }
      } catch (e) {
        console.error(e.message);
      }
    }

    /** @function init */
    function init() {
      try {
        slides = slider.querySelector('.c-slider__slides');
        slideList = slides.querySelectorAll('.c-slider__slide');
        numberOfSlides = slideList.length;
        frame = slider.querySelector('.c-slider__frame');
        buttonPrevious = slider.querySelector('.js-slider__button--prev');
        buttonNext = slider.querySelector('.js-slider__button--next');

        controlsPresent = !!(buttonPrevious && buttonNext);

        calculate();

        // Animation events listeners
        PrefixedEvent(slides, 'transitionend', handleAnimationEvents);

        // Touch event listeners
        if (controlsPresent) {
          frame.addEventListener('touchstart', handleTouchEvents, false);
          frame.addEventListener('touchend', handleTouchEvents, false);
          frame.addEventListener('touchmove', handleTouchEvents, false);
          frame.addEventListener('touchcancel', handleTouchEvents, false);

          // Listen for mouse clicks on prev/next buttons
          root.addEventListener('click', ev => {
            if (ev.target && ev.target.classList.contains('js-slider__button--next')) {
              autoSlideManualOverride = true;
              slide('left');
            } else if (ev.target && ev.target.classList.contains('js-slider__button--prev')) {
              autoSlideManualOverride = true;
              slide('right');
            }
          });

          updateButtonState();
        }


        if (autoSlide) startAutoSlide();
      } catch (e) {
        console.error(e.message);
      }
    }

    // Public

    /**
     * @method getSlidedSlidesCount - Returns the number of slided slides
     * @returns {number}
     */
    this.getSlidedSlidesCount = () => {
      return slidedSlidesCount;
    };

    // Adding event listeners
    root.addEventListener('resize', ev => {
      calculate();
    });

    if (!started) {
      init();
      started = true;
    }
  }

  root.Slider = Slider;
})(typeof global !== 'undefined' ? global : window);
