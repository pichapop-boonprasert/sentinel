import { describe, it, expect } from 'vitest';
import {
  isSupported,
  getLanguage,
  getExtension,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_EXTENSION_LIST,
} from './language-support';

describe('language-support', () => {
  describe('isSupported', () => {
    describe('JavaScript files', () => {
      it('should support .js files', () => {
        expect(isSupported('app.js')).toBe(true);
        expect(isSupported('src/utils/helper.js')).toBe(true);
      });

      it('should support .jsx files', () => {
        expect(isSupported('Component.jsx')).toBe(true);
        expect(isSupported('src/components/Button.jsx')).toBe(true);
      });
    });

    describe('TypeScript files', () => {
      it('should support .ts files', () => {
        expect(isSupported('app.ts')).toBe(true);
        expect(isSupported('src/types/index.ts')).toBe(true);
      });

      it('should support .tsx files', () => {
        expect(isSupported('Component.tsx')).toBe(true);
        expect(isSupported('src/components/Button.tsx')).toBe(true);
      });
    });

    describe('Python files', () => {
      it('should support .py files', () => {
        expect(isSupported('main.py')).toBe(true);
        expect(isSupported('src/utils/helpers.py')).toBe(true);
      });
    });

    describe('Java files', () => {
      it('should support .java files', () => {
        expect(isSupported('Main.java')).toBe(true);
        expect(isSupported('src/com/example/User.java')).toBe(true);
      });
    });

    describe('C# files', () => {
      it('should support .cs files', () => {
        expect(isSupported('Program.cs')).toBe(true);
        expect(isSupported('src/Models/User.cs')).toBe(true);
      });
    });

    describe('JSON files', () => {
      it('should support .json files', () => {
        expect(isSupported('config.json')).toBe(true);
        expect(isSupported('package.json')).toBe(true);
        expect(isSupported('.kiro/masking-config.json')).toBe(true);
      });
    });

    describe('unsupported files', () => {
      it('should not support CSS files', () => {
        expect(isSupported('styles.css')).toBe(false);
      });

      it('should not support HTML files', () => {
        expect(isSupported('index.html')).toBe(false);
      });

      it('should not support Markdown files', () => {
        expect(isSupported('README.md')).toBe(false);
      });

      it('should not support YAML files', () => {
        expect(isSupported('config.yaml')).toBe(false);
        expect(isSupported('config.yml')).toBe(false);
      });

      it('should not support files without extensions', () => {
        expect(isSupported('Makefile')).toBe(false);
        expect(isSupported('Dockerfile')).toBe(false);
      });

      it('should not support unknown extensions', () => {
        expect(isSupported('file.xyz')).toBe(false);
        expect(isSupported('data.bin')).toBe(false);
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase extensions', () => {
        expect(isSupported('app.JS')).toBe(true);
        expect(isSupported('app.TS')).toBe(true);
        expect(isSupported('app.PY')).toBe(true);
        expect(isSupported('app.JAVA')).toBe(true);
        expect(isSupported('app.CS')).toBe(true);
        expect(isSupported('app.JSON')).toBe(true);
      });

      it('should handle mixed case extensions', () => {
        expect(isSupported('app.Js')).toBe(true);
        expect(isSupported('app.Tsx')).toBe(true);
        expect(isSupported('app.Json')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle files with multiple dots', () => {
        expect(isSupported('app.test.ts')).toBe(true);
        expect(isSupported('config.prod.json')).toBe(true);
        expect(isSupported('file.backup.txt')).toBe(false);
      });

      it('should handle hidden files with extensions', () => {
        expect(isSupported('.eslintrc.js')).toBe(true);
        expect(isSupported('.prettierrc.json')).toBe(true);
      });

      it('should handle empty string', () => {
        expect(isSupported('')).toBe(false);
      });

      it('should handle paths with spaces', () => {
        expect(isSupported('my folder/my file.ts')).toBe(true);
      });
    });
  });

  describe('getLanguage', () => {
    it('should return javascript for .js and .jsx files', () => {
      expect(getLanguage('app.js')).toBe('javascript');
      expect(getLanguage('Component.jsx')).toBe('javascript');
    });

    it('should return typescript for .ts and .tsx files', () => {
      expect(getLanguage('app.ts')).toBe('typescript');
      expect(getLanguage('Component.tsx')).toBe('typescript');
    });

    it('should return python for .py files', () => {
      expect(getLanguage('main.py')).toBe('python');
    });

    it('should return java for .java files', () => {
      expect(getLanguage('Main.java')).toBe('java');
    });

    it('should return csharp for .cs files', () => {
      expect(getLanguage('Program.cs')).toBe('csharp');
    });

    it('should return json for .json files', () => {
      expect(getLanguage('config.json')).toBe('json');
    });

    it('should return null for unsupported files', () => {
      expect(getLanguage('styles.css')).toBeNull();
      expect(getLanguage('README.md')).toBeNull();
      expect(getLanguage('Makefile')).toBeNull();
    });

    it('should be case insensitive', () => {
      expect(getLanguage('app.TS')).toBe('typescript');
      expect(getLanguage('app.PY')).toBe('python');
    });
  });

  describe('getExtension', () => {
    it('should return lowercase extension with dot', () => {
      expect(getExtension('app.ts')).toBe('.ts');
      expect(getExtension('app.TS')).toBe('.ts');
      expect(getExtension('app.Tsx')).toBe('.tsx');
    });

    it('should return empty string for files without extension', () => {
      expect(getExtension('Makefile')).toBe('');
    });

    it('should return last extension for files with multiple dots', () => {
      expect(getExtension('app.test.ts')).toBe('.ts');
      expect(getExtension('config.prod.json')).toBe('.json');
    });
  });

  describe('SUPPORTED_EXTENSIONS', () => {
    it('should contain all expected extensions', () => {
      expect(SUPPORTED_EXTENSIONS.has('.js')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.jsx')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.ts')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.tsx')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.py')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.cs')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.java')).toBe(true);
      expect(SUPPORTED_EXTENSIONS.has('.json')).toBe(true);
    });

    it('should have exactly 8 supported extensions', () => {
      expect(SUPPORTED_EXTENSIONS.size).toBe(8);
    });
  });

  describe('SUPPORTED_EXTENSION_LIST', () => {
    it('should be an array of all supported extensions', () => {
      expect(SUPPORTED_EXTENSION_LIST).toContain('.js');
      expect(SUPPORTED_EXTENSION_LIST).toContain('.jsx');
      expect(SUPPORTED_EXTENSION_LIST).toContain('.ts');
      expect(SUPPORTED_EXTENSION_LIST).toContain('.tsx');
      expect(SUPPORTED_EXTENSION_LIST).toContain('.py');
      expect(SUPPORTED_EXTENSION_LIST).toContain('.cs');
      expect(SUPPORTED_EXTENSION_LIST).toContain('.java');
      expect(SUPPORTED_EXTENSION_LIST).toContain('.json');
    });

    it('should have the same length as SUPPORTED_EXTENSIONS', () => {
      expect(SUPPORTED_EXTENSION_LIST.length).toBe(SUPPORTED_EXTENSIONS.size);
    });
  });
});
