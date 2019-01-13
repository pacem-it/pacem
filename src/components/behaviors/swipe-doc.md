# Swipe (Behavioral Element)
`<pacem-swipe>` is a **behavioral element**:
it "just" adds behaviors to other elements that register to it.

```html
<pacem-swipe id="swiper" 
    on-swipe="console.log($event.detail)"
    on-swipeleft="console.log('left!')" 
    on-swiperight="console.log('right!')"></pacem-swipe>

<pacem-panel behaviors="{{ [ #swiper ] }}">Swipe me either way!</pacem-panel>
<pacem-panel behaviors="{{ [ #swiper ] }}">Me too, me, me!</pacem-panel>
```
## Reference

### Properties and Attributes


### Events

#### `swipeleft`
Occurs when the element is detected to be swiped leftwards.

#### `swiperight`
Occurs when the element is detected to be swiped rightwards.

#### `swipe` 
Occurs when either a `swipeleft` or a `swiperight` event fires.  
This fires right **before** those - more specific - events.

## How was it implemented
> `<pacem-swipe>` takes into consideration the physics around us.

Imagine that, in order to make an element reach a "non-return" point
(where the `swipe` event triggers), you might either :

- **DRAG** it up to that point;
- **LAUNCH** it toward that point with enough kinetic energy.

Furthermore, imagine that the element is mantained in its current position by 
some kind-of **elastic force** centered there.

#### In the DRAG case 
You (the interacative user) will experience more and more resistance along the way while approaching
the point.  

#### In the LAUNCH case
You (the interacative user) will see the element slowing down due to increasing resistence.

#### In BOTH cases
If the element don't reach the threshold point, the elastic force will pull it back to its
original position.