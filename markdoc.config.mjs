import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  tags: {
    relatedProducts: {
      render: component('./src/components/RelatedProductsGrid.astro'),
      attributes: {
        products: {
          type: Array,
          required: true,
          description: 'Daftar slug produk yang akan ditampilkan'
        }
      }
    }
  }
});