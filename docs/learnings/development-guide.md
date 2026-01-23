### Instructions for Code Creation Using SOLID Principles and Spec-Driven Development

As a veteran Product Manager with hands-on SWE experience, I've distilled these instructions to ensure code is maintainable, scalable, and aligned with business needs. Follow them sequentially for every feature or module.

1. **Define Clear Specifications (Spec-Driven Foundation)**:
   - Start with a concise spec document outlining user stories, acceptance criteria, edge cases, and non-functional requirements (e.g., performance, security).
   - Use BDD-style language: "Given [context], When [action], Then [outcome]" to make specs testable and unambiguous.
   - Collaborate with stakeholders to validate specs before coding—aim for 1-2 pages max per feature.

2. **Apply Single Responsibility Principle (S)**:
   - Design each class, function, or module to handle one responsibility only (e.g., a UserService handles user ops, not email sending).
   - Break down complex logic: If a class does more than one thing, refactor into smaller units.

3. **Ensure Open-Closed Principle (O)**:
   - Write code open for extension (e.g., via inheritance or interfaces) but closed for modification.
   - Use abstractions: Favor composition over inheritance; plug in new behaviors without altering existing code.

4. **Adhere to Liskov Substitution Principle (L)**:
   - Subtypes must be substitutable for base types without breaking behavior.
   - Validate: If a subclass changes preconditions/postconditions unexpectedly, redesign to maintain compatibility.

5. **Implement Interface Segregation Principle (I)**:
   - Create small, focused interfaces rather than large ones (e.g., separate IAuthenticator from IUserManager).
   - Clients should only depend on methods they use—avoid "fat" interfaces that force unnecessary implementations.

6. **Follow Dependency Inversion Principle (D)**:
   - High-level modules shouldn't depend on low-level ones; both depend on abstractions.
   - Use dependency injection: Inject interfaces (e.g., via constructors) to decouple and enable mocking for tests.

7. **Iterate with Spec-Driven Validation**:
   - Write tests from specs first (TDD/BDD approach): Unit tests for SOLID compliance, integration tests for end-to-end flows.
   - Code-review checkpoint: Ensure every commit adheres to SOLID; refactor if specs evolve.
   - Measure success: Code should be easy to extend (e.g., add a feature in <1 day) and test coverage >80%.

This framework minimizes tech debt, speeds up iterations, and aligns dev with product goals. Adapt to your tech stack (e.g., Java, Python) but enforce consistently.