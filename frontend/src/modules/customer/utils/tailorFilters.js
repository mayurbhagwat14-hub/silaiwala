/** Tailor-list filters shared by the home filter button and the Tailors page (kept in the URL). */
export const DEFAULT_TAILOR_FILTERS = {
    sortBy: 'priority',
    rating: '',
    minPrice: '',
    maxPrice: 10000,
};

const SORTS = ['priority', 'rating', 'distance', 'price_low', 'price_high'];
const RATINGS = ['', '3', '4'];

/** Only non-default values go in the URL, e.g. "sortBy=rating&rating=4". */
export const tailorFiltersToQuery = (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.sortBy && filters.sortBy !== DEFAULT_TAILOR_FILTERS.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.rating) params.set('rating', filters.rating);
    if (Number(filters.maxPrice) && Number(filters.maxPrice) < DEFAULT_TAILOR_FILTERS.maxPrice) {
        params.set('maxPrice', String(Number(filters.maxPrice)));
    }
    return params.toString();
};

/** Reads filters back from a query string, ignoring anything invalid. */
export const tailorFiltersFromQuery = (search = '') => {
    const params = new URLSearchParams(search);
    const sortBy = params.get('sortBy');
    const rating = params.get('rating') || '';
    const maxPrice = Number(params.get('maxPrice'));
    return {
        ...DEFAULT_TAILOR_FILTERS,
        sortBy: SORTS.includes(sortBy) ? sortBy : DEFAULT_TAILOR_FILTERS.sortBy,
        rating: RATINGS.includes(rating) ? rating : '',
        maxPrice: maxPrice >= 100 && maxPrice < 10000 ? maxPrice : DEFAULT_TAILOR_FILTERS.maxPrice,
    };
};
