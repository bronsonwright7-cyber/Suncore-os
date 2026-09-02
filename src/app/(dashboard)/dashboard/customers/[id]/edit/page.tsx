import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customers/customer-form";
import { getCustomer, listCustomerPhoneNumbers } from "@/server/customers/queries";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, phoneNumbers] = await Promise.all([
    getCustomer(id),
    listCustomerPhoneNumbers(id),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">
          Edit {customer.first_name} {customer.last_name}
        </h1>
      </div>
      <CustomerForm customer={customer} phoneNumbers={phoneNumbers} />
    </div>
  );
}
