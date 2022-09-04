def check_numpy_shape(np_array):
    """
    check_numpy_shape returns True for an numpy array of shape (3,3)
    >>> import numpy as np
    >>> a = np.array([[1, 0, 0], [0, 1, 2], [0, 1, 3]])
    >>> check_numpy_shape(a)
    True
    >>> b = np.array([[1, 0], [0, 1], [0, 1]])
    >>> check_numpy_shape(b)
    False
    """
