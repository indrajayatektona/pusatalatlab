import { defineMarkdocConfig, component, nodes } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  nodes: {
    image: {
      ...nodes.image,
      render: component('./src/components/MarkdocImage.astro'),
    },
  },
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