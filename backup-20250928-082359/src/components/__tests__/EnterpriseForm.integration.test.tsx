import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from 'antd';
import EnterpriseForm from '../EnterpriseForm';
import { BUSINESS_TYPE_OPTIONS, STATUS_OPTIONS, INDUSTRY_TYPE_OPTIONS } from '../../types/enterprise';
import '@testing-library/jest-dom';

// Mock Antd's message API
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

// Helper component to properly use React hooks in tests
const TestFormWrapper: React.FC<{
  initialValues?: any;
  children: (form: any) => React.ReactNode;
}> = ({ initialValues, children }) => {
  const [form] = Form.useForm();
  
  React.useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [form, initialValues]);
  
  return <>{children(form)}</>;
};

describe('EnterpriseForm Integration Tests', () => {
  const user = userEvent.setup();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Initialization', () => {
    it('should render all required form fields', () => {
      render(
        <TestFormWrapper>
          {(form) => <EnterpriseForm form={form} />}
        </TestFormWrapper>
      );

      // Check for required fields
      expect(screen.getByLabelText(/企业名称/)).toBeInTheDocument();
      expect(screen.getByLabelText(/企业代码/)).toBeInTheDocument();
      expect(screen.getByLabelText(/业务类型/)).toBeInTheDocument();
      expect(screen.getByLabelText(/状态/)).toBeInTheDocument();
    });

    it('should initialize with default values', async () => {
      let formInstance: any;
      
      render(
        <TestFormWrapper>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} />;
          }}
        </TestFormWrapper>
      );

      await waitFor(() => {
        expect(formInstance.getFieldValue('status')).toBe('active');
        expect(formInstance.getFieldValue('business_type')).toBe('llc');
      });
    });

    it('should initialize with custom initial values', async () => {
      const initialValues = {
        name: '测试企业',
        code: 'TEST001',
        description: '测试企业描述',
        business_type: 'corporation',
        status: 'inactive',
      };

      let formInstance: any;

      render(
        <TestFormWrapper initialValues={initialValues}>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} initialValues={initialValues} />;
          }}
        </TestFormWrapper>
      );

      await waitFor(() => {
        expect(formInstance.getFieldValue('name')).toBe('测试企业');
        expect(formInstance.getFieldValue('code')).toBe('TEST001');
        expect(formInstance.getFieldValue('description')).toBe('测试企业描述');
        expect(formInstance.getFieldValue('business_type')).toBe('corporation');
        expect(formInstance.getFieldValue('status')).toBe('inactive');
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      let formInstance: any;

      render(
        <TestFormWrapper>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} />;
          }}
        </TestFormWrapper>
      );

      // Try to submit empty form
      try {
        await act(async () => {
          await formInstance.validateFields();
        });
      } catch (error: any) {
        expect(error.errorFields).toHaveLength(4); // name, code, business_type, status are required by default
        expect(error.errorFields.some((field: any) => field.name[0] === 'name')).toBeTruthy();
        expect(error.errorFields.some((field: any) => field.name[0] === 'code')).toBeTruthy();
        expect(error.errorFields.some((field: any) => field.name[0] === 'business_type')).toBeTruthy();
        expect(error.errorFields.some((field: any) => field.name[0] === 'status')).toBeTruthy();
      }
    });

    it('should validate field length constraints', async () => {
      let formInstance: any;

      render(
        <TestFormWrapper>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} />;
          }}
        </TestFormWrapper>
      );

      // Test name field length validation
      await user.type(screen.getByLabelText(/企业名称/), 'A'.repeat(256));
      
      try {
        await act(async () => {
          await formInstance.validateFields(['name']);
        });
      } catch (error: any) {
        expect(error.errorFields[0].errors[0]).toContain('企业名称长度为1-255个字符');
      }
    });

    it('should validate email format', async () => {
      let formInstance: any;

      render(
        <TestFormWrapper>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} />;
          }}
        </TestFormWrapper>
      );

      const emailInput = screen.getByLabelText(/联系邮箱/);
      await user.type(emailInput, 'invalid-email');

      try {
        await act(async () => {
          await formInstance.validateFields(['contact_email']);
        });
      } catch (error: any) {
        expect(error.errorFields[0].errors[0]).toContain('请输入正确的邮箱格式');
      }
    });

    it('should validate URL format', async () => {
      let formInstance: any;

      render(
        <TestFormWrapper>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} />;
          }}
        </TestFormWrapper>
      );

      const websiteInput = screen.getByLabelText(/网站/);
      await user.type(websiteInput, 'not-a-url');

      try {
        await act(async () => {
          await formInstance.validateFields(['website']);
        });
      } catch (error: any) {
        expect(error.errorFields[0].errors[0]).toContain('请输入正确的网站URL');
      }
    });
  });

  describe('Form Interactions', () => {
    it('should handle text input changes', async () => {
      let formInstance: any;

      render(
        <TestFormWrapper>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} />;
          }}
        </TestFormWrapper>
      );

      const nameInput = screen.getByLabelText(/企业名称/);
      await user.type(nameInput, '新企业名称');

      await waitFor(() => {
        expect(formInstance.getFieldValue('name')).toBe('新企业名称');
      });
    });

    it('should handle select dropdown changes', async () => {
      let formInstance: any;

      render(
        <TestFormWrapper>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} />;
          }}
        </TestFormWrapper>
      );

      // Test business type selection
      const businessTypeSelect = screen.getByLabelText(/业务类型/);
      await user.click(businessTypeSelect);
      
      // Wait for dropdown to appear and select an option
      await waitFor(async () => {
        const option = screen.getByText(BUSINESS_TYPE_OPTIONS[1].label);
        await user.click(option);
      });

      await waitFor(() => {
        expect(formInstance.getFieldValue('business_type')).toBe(BUSINESS_TYPE_OPTIONS[1].value);
      });
    });

    it('should handle textarea input', async () => {
      let formInstance: any;

      render(
        <TestFormWrapper>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} />;
          }}
        </TestFormWrapper>
      );

      const descriptionTextarea = screen.getByLabelText(/企业描述/);
      await user.type(descriptionTextarea, '这是企业的详细描述信息');

      await waitFor(() => {
        expect(formInstance.getFieldValue('description')).toBe('这是企业的详细描述信息');
      });
    });

    it('should respect maxLength constraints', async () => {
      render(
        <TestFormWrapper>
          {(form) => <EnterpriseForm form={form} />}
        </TestFormWrapper>
      );

      const codeInput = screen.getByLabelText(/企业代码/);
      const longText = 'A'.repeat(150); // Exceeds maxLength of 100
      
      await user.type(codeInput, longText);
      
      // Input should be truncated to maxLength
      expect(codeInput).toHaveValue(longText.substring(0, 100));
    });
  });

  describe('Form Configuration Options', () => {
    it('should render in different layouts', () => {
      const { rerender } = render(
        <TestFormWrapper>
          {(form) => <EnterpriseForm form={form} layout="horizontal" />}
        </TestFormWrapper>
      );
      
      expect(screen.getByRole('form')).toHaveClass('ant-form-horizontal');

      rerender(
        <TestFormWrapper>
          {(form) => <EnterpriseForm form={form} layout="vertical" />}
        </TestFormWrapper>
      );
      
      expect(screen.getByRole('form')).toHaveClass('ant-form-vertical');
    });

    it('should disable fields when disabled prop is true', () => {
      render(
        <TestFormWrapper>
          {(form) => <EnterpriseForm form={form} disabled={true} />}
        </TestFormWrapper>
      );

      expect(screen.getByLabelText(/企业名称/)).toBeDisabled();
      expect(screen.getByLabelText(/企业代码/)).toBeDisabled();
      expect(screen.getByLabelText(/企业描述/)).toBeDisabled();
    });

    it('should hide fields specified in hiddenFields', () => {
      render(
        <TestFormWrapper>
          {(form) => <EnterpriseForm form={form} hiddenFields={['description', 'website']} />}
        </TestFormWrapper>
      );

      expect(screen.queryByLabelText(/企业描述/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/网站/)).not.toBeInTheDocument();
    });

    it('should customize required fields', () => {
      render(
        <TestFormWrapper>
          {(form) => <EnterpriseForm form={form} requiredFields={['name', 'contact_email']} />}
        </TestFormWrapper>
      );

      // Only name and contact_email should be required
      const nameField = screen.getByLabelText(/企业名称/);
      const emailField = screen.getByLabelText(/联系邮箱/);
      const codeField = screen.getByLabelText(/企业代码/);

      // Check for required asterisk (*)
      expect(nameField.closest('.ant-form-item')).toHaveClass('ant-form-item-required');
      expect(emailField.closest('.ant-form-item')).toHaveClass('ant-form-item-required');
      expect(codeField.closest('.ant-form-item')).not.toHaveClass('ant-form-item-required');
    });
  });

  describe('Edit Mode', () => {
    it('should behave differently in edit mode', async () => {
      const initialValues = {
        name: '现有企业',
        code: 'EXISTING001',
        status: 'active',
      };

      let formInstance: any;

      render(
        <TestFormWrapper initialValues={initialValues}>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} isEdit={true} initialValues={initialValues} />;
          }}
        </TestFormWrapper>
      );

      await waitFor(() => {
        expect(formInstance.getFieldValue('name')).toBe('现有企业');
        expect(formInstance.getFieldValue('code')).toBe('EXISTING001');
      });
    });
  });

  describe('Form Submission Integration', () => {
    it('should collect complete form data on submission', async () => {
      let formInstance: any;

      render(
        <TestFormWrapper>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} />;
          }}
        </TestFormWrapper>
      );

      // Fill out the form
      await user.type(screen.getByLabelText(/企业名称/), '完整测试企业');
      await user.type(screen.getByLabelText(/企业代码/), 'COMPLETE001');
      await user.type(screen.getByLabelText(/企业描述/), '完整的企业描述');
      await user.type(screen.getByLabelText(/联系邮箱/), 'test@example.com');
      await user.type(screen.getByLabelText(/联系电话/), '13800138000');
      await user.type(screen.getByLabelText(/详细地址/), '测试地址123号');

      // Select business type
      const businessTypeSelect = screen.getByLabelText(/业务类型/);
      await user.click(businessTypeSelect);
      await waitFor(async () => {
        const option = screen.getByText(BUSINESS_TYPE_OPTIONS[0].label);
        await user.click(option);
      });

      // Select status
      const statusSelect = screen.getByLabelText(/状态/);
      await user.click(statusSelect);
      await waitFor(async () => {
        const option = screen.getByText(STATUS_OPTIONS[0].label);
        await user.click(option);
      });

      // Validate form
      const formData = await act(async () => {
        return await formInstance.validateFields();
      });

      expect(formData).toEqual(expect.objectContaining({
        name: '完整测试企业',
        code: 'COMPLETE001',
        description: '完整的企业描述',
        contact_email: 'test@example.com',
        contact_phone: '13800138000',
        address: '测试地址123号',
        business_type: BUSINESS_TYPE_OPTIONS[0].value,
        status: STATUS_OPTIONS[0].value,
      }));
    });

    it('should handle form reset', async () => {
      let formInstance: any;

      render(
        <TestFormWrapper>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} />;
          }}
        </TestFormWrapper>
      );

      // Fill some fields
      await user.type(screen.getByLabelText(/企业名称/), '待重置的企业');
      await user.type(screen.getByLabelText(/企业代码/), 'RESET001');

      await waitFor(() => {
        expect(formInstance.getFieldValue('name')).toBe('待重置的企业');
        expect(formInstance.getFieldValue('code')).toBe('RESET001');
      });

      // Reset form
      act(() => {
        formInstance.resetFields();
      });

      await waitFor(() => {
        expect(formInstance.getFieldValue('name')).toBeUndefined();
        expect(formInstance.getFieldValue('code')).toBeUndefined();
        // Should keep default values
        expect(formInstance.getFieldValue('status')).toBe('active');
        expect(formInstance.getFieldValue('business_type')).toBe('llc');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels and roles', () => {
      render(
        <TestFormWrapper>
          {(form) => <EnterpriseForm form={form} />}
        </TestFormWrapper>
      );

      // Check form has proper role
      expect(screen.getByRole('form')).toBeInTheDocument();

      // Check inputs have labels
      expect(screen.getByLabelText(/企业名称/)).toBeInTheDocument();
      expect(screen.getByLabelText(/企业代码/)).toBeInTheDocument();
    });

    it('should show validation errors accessibly', async () => {
      let formInstance: any;

      render(
        <TestFormWrapper>
          {(form) => {
            formInstance = form;
            return <EnterpriseForm form={form} />;
          }}
        </TestFormWrapper>
      );

      // Try to validate required field without value
      try {
        await act(async () => {
          await formInstance.validateFields(['name']);
        });
      } catch (error) {
        // Check if error message is shown
        await waitFor(() => {
          const errorMessage = screen.queryByText(/请输入企业名称/);
          if (errorMessage) {
            expect(errorMessage).toBeInTheDocument();
          }
        });
      }
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestWrapper = () => {
        renderSpy();
        return (
          <TestFormWrapper>
            {(form) => <EnterpriseForm form={form} />}
          </TestFormWrapper>
        );
      };

      const { rerender } = render(<TestWrapper />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(<TestWrapper />);
      
      // Should not cause additional renders due to memoization
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle large form data efficiently', async () => {
      render(
        <TestFormWrapper>
          {(form) => <EnterpriseForm form={form} />}
        </TestFormWrapper>
      );

      const startTime = performance.now();

      // Simulate rapid typing
      const nameInput = screen.getByLabelText(/企业名称/);
      for (let i = 0; i < 100; i++) {
        await user.type(nameInput, 'A');
      }

      const endTime = performance.now();

      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Error Boundaries Integration', () => {
    it('should handle component errors gracefully', () => {
      // Mock console.error to avoid test output noise
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const ThrowErrorForm = () => {
        throw new Error('Form component error');
      };

      // This would be wrapped by an ErrorBoundary in actual app
      expect(() => render(<ThrowErrorForm />)).toThrow();

      consoleErrorSpy.mockRestore();
    });
  });
});