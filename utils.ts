export const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

export const formatCurrencyShort = (val: number) => {
    return formatCurrency(val).replace('.00', '');
};
