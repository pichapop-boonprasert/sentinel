/**
 * Tests for language-specific parsers.
 * 
 * @module scanner/parsers/parsers.test
 */

import { describe, it, expect } from 'vitest';
import { JavaScriptParser, TypeScriptParser } from './javascript-parser';
import { PythonParser } from './python-parser';
import { JavaParser } from './java-parser';
import { CSharpParser } from './csharp-parser';
import { JsonParser } from './json-parser';
import { getParser, getSupportedLanguages, isLanguageSupported } from './index';

describe('Parser Registry', () => {
  it('should return all supported languages', () => {
    const languages = getSupportedLanguages();
    expect(languages).toContain('javascript');
    expect(languages).toContain('typescript');
    expect(languages).toContain('python');
    expect(languages).toContain('java');
    expect(languages).toContain('csharp');
    expect(languages).toContain('json');
  });

  it('should return correct parser for each language', () => {
    expect(getParser('javascript')).toBeInstanceOf(JavaScriptParser);
    expect(getParser('typescript')).toBeInstanceOf(TypeScriptParser);
    expect(getParser('python')).toBeInstanceOf(PythonParser);
    expect(getParser('java')).toBeInstanceOf(JavaParser);
    expect(getParser('csharp')).toBeInstanceOf(CSharpParser);
    expect(getParser('json')).toBeInstanceOf(JsonParser);
  });

  it('should return null for unsupported languages', () => {
    expect(getParser('ruby')).toBeNull();
    expect(getParser('go')).toBeNull();
  });

  it('should correctly check language support', () => {
    expect(isLanguageSupported('javascript')).toBe(true);
    expect(isLanguageSupported('ruby')).toBe(false);
  });
});

describe('JavaScriptParser', () => {
  const parser = new JavaScriptParser();

  it('should extract variable declarations', () => {
    const code = `
const userName = 'John';
let userEmail = 'john@example.com';
var userPassword = 'secret';
`;
    const result = parser.parse(code, 'test.js');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('userName');
    expect(fieldNames).toContain('userEmail');
    expect(fieldNames).toContain('userPassword');
  });

  it('should extract class properties', () => {
    const code = `
class User {
  name = '';
  email = '';
  password = '';
}
`;
    const result = parser.parse(code, 'test.js');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('password');
  });

  it('should extract object properties', () => {
    const code = `
const user = {
  firstName: 'John',
  lastName: 'Doe',
  ssn: '123-45-6789'
};
`;
    const result = parser.parse(code, 'test.js');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('firstName');
    expect(fieldNames).toContain('lastName');
    expect(fieldNames).toContain('ssn');
  });

  it('should extract function parameters', () => {
    const code = `
function processUser(userId, userEmail, apiKey) {
  return { userId, userEmail };
}
`;
    const result = parser.parse(code, 'test.js');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('userId');
    expect(fieldNames).toContain('userEmail');
    expect(fieldNames).toContain('apiKey');
  });

  it('should extract destructured variables', () => {
    const code = `
const { name, email, password } = user;
const [first, second] = items;
`;
    const result = parser.parse(code, 'test.js');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('password');
    expect(fieldNames).toContain('first');
    expect(fieldNames).toContain('second');
  });

  it('should capture parent scope context', () => {
    const code = `
class UserService {
  processUser(userId) {
    const email = 'test@example.com';
    return email;
  }
}
`;
    const result = parser.parse(code, 'test.js');
    
    const emailField = result.fields.find(f => f.name === 'email');
    expect(emailField).toBeDefined();
    expect(emailField?.context.parentScope).toContain('class:UserService');
    expect(emailField?.context.parentScope).toContain('method:processUser');
  });

  it('should capture surrounding code context', () => {
    const code = `
// User's email address
const userEmail = 'test@example.com';
// Next line
`;
    const result = parser.parse(code, 'test.js');
    
    const emailField = result.fields.find(f => f.name === 'userEmail');
    expect(emailField).toBeDefined();
    expect(emailField?.context.surroundingCode).toContain('userEmail');
  });

  it('should handle syntax errors gracefully', () => {
    const code = `
const x = {
  invalid syntax here
`;
    const result = parser.parse(code, 'test.js');
    
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('TypeScriptParser', () => {
  const parser = new TypeScriptParser();

  it('should extract typed variable declarations', () => {
    const code = `
const userName: string = 'John';
let userAge: number = 30;
const isActive: boolean = true;
`;
    const result = parser.parse(code, 'test.ts');
    
    expect(result.errors).toHaveLength(0);
    
    const nameField = result.fields.find(f => f.name === 'userName');
    expect(nameField?.type).toBe('string');
    
    const ageField = result.fields.find(f => f.name === 'userAge');
    expect(ageField?.type).toBe('number');
    
    const activeField = result.fields.find(f => f.name === 'isActive');
    expect(activeField?.type).toBe('boolean');
  });

  it('should extract interface properties', () => {
    const code = `
interface User {
  id: number;
  email: string;
  password: string;
  creditCard?: string;
}
`;
    const result = parser.parse(code, 'test.ts');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('password');
    expect(fieldNames).toContain('creditCard');
  });

  it('should extract type alias properties', () => {
    const code = `
type UserData = {
  name: string;
  ssn: string;
  bankAccount: string;
};
`;
    const result = parser.parse(code, 'test.ts');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('ssn');
    expect(fieldNames).toContain('bankAccount');
  });

  it('should extract typed class properties', () => {
    const code = `
class User {
  private email: string;
  public name: string;
  protected password: string;
}
`;
    const result = parser.parse(code, 'test.ts');
    
    expect(result.errors).toHaveLength(0);
    
    const emailField = result.fields.find(f => f.name === 'email');
    expect(emailField?.type).toBe('string');
  });

  it('should extract typed function parameters', () => {
    const code = `
function processUser(userId: number, email: string): void {
  console.log(userId, email);
}
`;
    const result = parser.parse(code, 'test.ts');
    
    expect(result.errors).toHaveLength(0);
    
    const userIdField = result.fields.find(f => f.name === 'userId');
    expect(userIdField?.type).toBe('number');
    
    const emailField = result.fields.find(f => f.name === 'email');
    expect(emailField?.type).toBe('string');
  });

  it('should capture interface scope', () => {
    const code = `
interface UserProfile {
  email: string;
}
`;
    const result = parser.parse(code, 'test.ts');
    
    const emailField = result.fields.find(f => f.name === 'email');
    expect(emailField?.context.parentScope).toContain('interface:UserProfile');
  });
});

describe('PythonParser', () => {
  const parser = new PythonParser();

  it('should extract variable assignments', () => {
    const code = `
user_name = "John"
user_email = "john@example.com"
api_key = "secret123"
`;
    const result = parser.parse(code, 'test.py');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('user_name');
    expect(fieldNames).toContain('user_email');
    expect(fieldNames).toContain('api_key');
  });

  it('should extract typed variable assignments', () => {
    const code = `
user_name: str = "John"
user_age: int = 30
is_active: bool = True
`;
    const result = parser.parse(code, 'test.py');
    
    expect(result.errors).toHaveLength(0);
    
    const nameField = result.fields.find(f => f.name === 'user_name');
    expect(nameField?.type).toBe('str');
    
    const ageField = result.fields.find(f => f.name === 'user_age');
    expect(ageField?.type).toBe('int');
  });

  it('should extract class attributes', () => {
    const code = `
class User:
    name: str
    email: str
    password: str
`;
    const result = parser.parse(code, 'test.py');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('password');
  });

  it('should extract self attributes', () => {
    const code = `
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
        self.password = None
`;
    const result = parser.parse(code, 'test.py');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('password');
  });

  it('should extract function parameters', () => {
    const code = `
def process_user(user_id, email, api_key):
    return user_id
`;
    const result = parser.parse(code, 'test.py');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('user_id');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('api_key');
  });

  it('should extract typed function parameters', () => {
    const code = `
def process_user(user_id: int, email: str) -> None:
    pass
`;
    const result = parser.parse(code, 'test.py');
    
    expect(result.errors).toHaveLength(0);
    
    const userIdField = result.fields.find(f => f.name === 'user_id');
    expect(userIdField?.type).toBe('int');
    
    const emailField = result.fields.find(f => f.name === 'email');
    expect(emailField?.type).toBe('str');
  });

  it('should capture class scope', () => {
    const code = `
class UserService:
    api_key = "secret"
`;
    const result = parser.parse(code, 'test.py');
    
    const apiKeyField = result.fields.find(f => f.name === 'api_key');
    expect(apiKeyField?.context.parentScope).toContain('class:UserService');
  });

  it('should extract tuple unpacking', () => {
    const code = `
first_name, last_name = get_names()
`;
    const result = parser.parse(code, 'test.py');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('first_name');
    expect(fieldNames).toContain('last_name');
  });
});

describe('JavaParser', () => {
  const parser = new JavaParser();

  it('should extract class fields', () => {
    const code = `
public class User {
    private String name;
    private String email;
    private String password;
}
`;
    const result = parser.parse(code, 'User.java');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('password');
  });

  it('should extract field types', () => {
    const code = `
public class User {
    private String email;
    private int age;
    private boolean active;
}
`;
    const result = parser.parse(code, 'User.java');
    
    expect(result.errors).toHaveLength(0);
    
    const emailField = result.fields.find(f => f.name === 'email');
    expect(emailField?.type).toBe('String');
    
    const ageField = result.fields.find(f => f.name === 'age');
    expect(ageField?.type).toBe('int');
  });

  it('should extract method parameters', () => {
    const code = `
public class UserService {
    public void processUser(String userId, String email, String apiKey) {
        System.out.println(userId);
    }
}
`;
    const result = parser.parse(code, 'UserService.java');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('userId');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('apiKey');
  });

  it('should extract local variables', () => {
    const code = `
public class UserService {
    public void process() {
        String password = "secret";
        int creditCardNumber = 12345;
    }
}
`;
    const result = parser.parse(code, 'UserService.java');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('password');
    expect(fieldNames).toContain('creditCardNumber');
  });

  it('should extract record components', () => {
    const code = `
public record User(String name, String email, String ssn) {}
`;
    const result = parser.parse(code, 'User.java');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('ssn');
  });

  it('should extract for-each loop variables', () => {
    const code = `
public class UserService {
    public void process(List<User> users) {
        for (User user : users) {
            System.out.println(user);
        }
    }
}
`;
    const result = parser.parse(code, 'UserService.java');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('user');
  });

  it('should capture class scope', () => {
    const code = `
public class UserService {
    private String apiKey;
}
`;
    const result = parser.parse(code, 'UserService.java');
    
    const apiKeyField = result.fields.find(f => f.name === 'apiKey');
    expect(apiKeyField?.context.parentScope).toContain('class:UserService');
  });

  it('should extract generic type fields', () => {
    const code = `
public class UserService {
    private List<String> emails;
    private Map<String, User> userMap;
}
`;
    const result = parser.parse(code, 'UserService.java');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('emails');
    expect(fieldNames).toContain('userMap');
  });
});

describe('CSharpParser', () => {
  const parser = new CSharpParser();

  it('should extract class fields', () => {
    const code = `
public class User {
    private string name;
    private string email;
    private string password;
}
`;
    const result = parser.parse(code, 'User.cs');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('password');
  });

  it('should extract field types', () => {
    const code = `
public class User {
    private string email;
    private int age;
    private bool active;
}
`;
    const result = parser.parse(code, 'User.cs');
    
    expect(result.errors).toHaveLength(0);
    
    const emailField = result.fields.find(f => f.name === 'email');
    expect(emailField?.type).toBe('string');
    
    const ageField = result.fields.find(f => f.name === 'age');
    expect(ageField?.type).toBe('int');
  });

  it('should extract properties', () => {
    const code = `
public class User {
    public string Name { get; set; }
    public string Email { get; private set; }
    public int Age { get; }
}
`;
    const result = parser.parse(code, 'User.cs');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('Name');
    expect(fieldNames).toContain('Email');
    expect(fieldNames).toContain('Age');
  });

  it('should extract method parameters', () => {
    const code = `
public class UserService {
    public void ProcessUser(string userId, string email, string apiKey) {
        Console.WriteLine(userId);
    }
}
`;
    const result = parser.parse(code, 'UserService.cs');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('userId');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('apiKey');
  });

  it('should extract local variables', () => {
    const code = `
public class UserService {
    public void Process() {
        string password = "secret";
        int creditCardNumber = 12345;
    }
}
`;
    const result = parser.parse(code, 'UserService.cs');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('password');
    expect(fieldNames).toContain('creditCardNumber');
  });

  it('should extract record components', () => {
    const code = `
public record User(string Name, string Email, string Ssn);
`;
    const result = parser.parse(code, 'User.cs');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('Name');
    expect(fieldNames).toContain('Email');
    expect(fieldNames).toContain('Ssn');
  });

  it('should extract foreach loop variables', () => {
    const code = `
public class UserService {
    public void Process(List<User> users) {
        foreach (User user in users) {
            Console.WriteLine(user);
        }
    }
}
`;
    const result = parser.parse(code, 'UserService.cs');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('user');
  });

  it('should capture class scope', () => {
    const code = `
public class UserService {
    private string apiKey;
}
`;
    const result = parser.parse(code, 'UserService.cs');
    
    const apiKeyField = result.fields.find(f => f.name === 'apiKey');
    expect(apiKeyField?.context.parentScope).toContain('class:UserService');
  });

  it('should extract generic type fields', () => {
    const code = `
public class UserService {
    private List<string> emails;
    private Dictionary<string, User> userMap;
}
`;
    const result = parser.parse(code, 'UserService.cs');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('emails');
    expect(fieldNames).toContain('userMap');
  });

  it('should extract nullable type fields', () => {
    const code = `
public class User {
    private string? middleName;
    private int? age;
}
`;
    const result = parser.parse(code, 'User.cs');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('middleName');
    expect(fieldNames).toContain('age');
  });

  it('should extract comments', () => {
    const code = `
public class User {
    // User's email address - sensitive data
    private string email;
}
`;
    const result = parser.parse(code, 'User.cs');
    
    const emailField = result.fields.find(f => f.name === 'email');
    expect(emailField?.context.comments.length).toBeGreaterThan(0);
  });

  it('should capture method scope for local variables', () => {
    const code = `
public class UserService {
    public void ProcessUser() {
        string email = "test@example.com";
    }
}
`;
    const result = parser.parse(code, 'UserService.cs');
    
    const emailField = result.fields.find(f => f.name === 'email');
    expect(emailField).toBeDefined();
    expect(emailField?.context.parentScope).toContain('class:UserService');
    expect(emailField?.context.parentScope).toContain('method:ProcessUser');
  });
});

describe('JsonParser', () => {
  const parser = new JsonParser();

  it('should extract object properties', () => {
    const code = `{
  "userName": "John",
  "userEmail": "john@example.com",
  "password": "secret"
}`;
    const result = parser.parse(code, 'config.json');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('userName');
    expect(fieldNames).toContain('userEmail');
    expect(fieldNames).toContain('password');
  });

  it('should extract nested object properties', () => {
    const code = `{
  "user": {
    "name": "John",
    "credentials": {
      "apiKey": "secret123",
      "password": "pass"
    }
  }
}`;
    const result = parser.parse(code, 'config.json');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('user');
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('credentials');
    expect(fieldNames).toContain('apiKey');
    expect(fieldNames).toContain('password');
  });

  it('should capture parent scope for nested properties', () => {
    const code = `{
  "database": {
    "password": "secret"
  }
}`;
    const result = parser.parse(code, 'config.json');
    
    const passwordField = result.fields.find(f => f.name === 'password');
    expect(passwordField?.context.parentScope).toContain('database');
  });

  it('should handle arrays with objects', () => {
    const code = `{
  "users": [
    { "email": "user1@example.com" },
    { "email": "user2@example.com" }
  ]
}`;
    const result = parser.parse(code, 'config.json');
    
    expect(result.errors).toHaveLength(0);
    const fieldNames = result.fields.map(f => f.name);
    expect(fieldNames).toContain('users');
    expect(fieldNames).toContain('email');
  });

  it('should handle invalid JSON gracefully', () => {
    const code = `{
  "invalid": json here
}`;
    const result = parser.parse(code, 'config.json');
    
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].recoverable).toBe(false);
  });

  it('should capture code location', () => {
    const code = `{
  "apiKey": "secret"
}`;
    const result = parser.parse(code, 'config.json');
    
    const apiKeyField = result.fields.find(f => f.name === 'apiKey');
    expect(apiKeyField?.location.startLine).toBe(2);
    expect(apiKeyField?.location.filePath).toBe('config.json');
  });
});

describe('Parser Context Extraction', () => {
  it('should extract comments for JavaScript', () => {
    const parser = new JavaScriptParser();
    const code = `
// This is the user's email address
// It should be masked
const userEmail = 'test@example.com';
`;
    const result = parser.parse(code, 'test.js');
    
    const emailField = result.fields.find(f => f.name === 'userEmail');
    expect(emailField?.context.comments.length).toBeGreaterThan(0);
  });

  it('should extract comments for Python', () => {
    const parser = new PythonParser();
    const code = `
# This is the user's email address
# It should be masked
user_email = 'test@example.com'
`;
    const result = parser.parse(code, 'test.py');
    
    const emailField = result.fields.find(f => f.name === 'user_email');
    expect(emailField?.context.comments.length).toBeGreaterThan(0);
  });

  it('should extract comments for Java', () => {
    const parser = new JavaParser();
    const code = `
public class User {
    // User's email address - sensitive data
    private String email;
}
`;
    const result = parser.parse(code, 'User.java');
    
    const emailField = result.fields.find(f => f.name === 'email');
    expect(emailField?.context.comments.length).toBeGreaterThan(0);
  });

  it('should extract comments for C#', () => {
    const parser = new CSharpParser();
    const code = `
public class User {
    /// <summary>
    /// User's email address - sensitive data
    /// </summary>
    private string email;
}
`;
    const result = parser.parse(code, 'User.cs');
    
    const emailField = result.fields.find(f => f.name === 'email');
    expect(emailField?.context.comments.length).toBeGreaterThan(0);
  });
});
