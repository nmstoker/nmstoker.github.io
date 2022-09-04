import math
def area_circle(radius, decimals=2):
    """area_circle returns a string stating the area of a circle with the given radius
    area is stated to a given number of decimals with a default value of 2

    >>> area_circle(5)
    'Circle area is 78.54'
    >>> area_circle(5,4)
    'Circle area is 78.5398'
    >>> area_circle(7,0)
    'Circle area is 154'
    >>> area_circle(0)
    'Circle area is 0.00'
    >>> area_circle(-4)
    'Circle area is 50.27'
    """