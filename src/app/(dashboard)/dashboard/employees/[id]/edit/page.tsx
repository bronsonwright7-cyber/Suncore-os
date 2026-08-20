import { notFound } from "next/navigation";
import { EmployeeForm } from "@/components/employees/employee-form";
import { getEmployee } from "@/server/employees/queries";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getEmployee(id);

  if (!employee) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">
          Edit {employee.first_name} {employee.last_name}
        </h1>
      </div>
      <EmployeeForm employee={employee} />
    </div>
  );
}
