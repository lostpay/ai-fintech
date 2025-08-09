import React from 'react';
import { render } from '@testing-library/react-native';
import { PrivacyIndicator } from '../../../src/components/ai/PrivacyIndicator';

// Mock the theme context
jest.mock('../../../src/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        primary: '#2196F3',
      },
    },
  }),
}));

describe('PrivacyIndicator', () => {
  describe('On-Device Processing', () => {
    it('renders on-device indicator correctly', () => {
      const { getByText } = render(
        <PrivacyIndicator processingType="on-device" />
      );

      expect(getByText('On-device')).toBeTruthy();
    });

    it('uses correct color for on-device processing', () => {
      const { getByText } = render(
        <PrivacyIndicator processingType="on-device" />
      );

      const indicator = getByText('On-device').parent;
      expect(indicator?.props.style).toMatchObject({
        backgroundColor: '#E8F5E8',
      });
    });
  });

  describe('Cloud Processing', () => {
    it('renders cloud indicator correctly', () => {
      const { getByText } = render(
        <PrivacyIndicator processingType="hugging-face" />
      );

      expect(getByText('Cloud AI')).toBeTruthy();
    });

    it('uses correct color for cloud processing', () => {
      const { getByText } = render(
        <PrivacyIndicator processingType="hugging-face" />
      );

      const indicator = getByText('Cloud AI').parent;
      expect(indicator?.props.style).toMatchObject({
        backgroundColor: '#E3F2FD',
      });
    });
  });

  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      const { getByText } = render(
        <PrivacyIndicator processingType="on-device" size="small" />
      );

      const text = getByText('On-device');
      expect(text.props.style.fontSize).toBe(10);
    });

    it('renders medium size correctly', () => {
      const { getByText } = render(
        <PrivacyIndicator processingType="on-device" size="medium" />
      );

      const text = getByText('On-device');
      expect(text.props.style.fontSize).toBe(12);
    });
  });

  describe('Custom Styling', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 10 };
      
      const { getByText } = render(
        <PrivacyIndicator 
          processingType="on-device" 
          style={customStyle}
        />
      );

      const container = getByText('On-device').parent?.parent;
      expect(container?.props.style).toMatchObject(customStyle);
    });
  });
});