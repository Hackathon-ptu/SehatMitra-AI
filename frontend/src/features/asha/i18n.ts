/**
 * ASHA portal strings. English lives inline as the default value of every
 * t() call; this file adds other languages under the "asha" namespace.
 * Languages without a bundle fall back to English.
 */
import i18n from '../../i18n';
import hi from './locales/hi.json';

i18n.addResourceBundle('hi', 'asha', hi, true, true);
