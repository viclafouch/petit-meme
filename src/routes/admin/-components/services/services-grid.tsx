import { ServiceCard, SERVICES } from './service-card'

export const ServicesGrid = () => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {SERVICES.map((service) => {
        return <ServiceCard key={service.label} service={service} />
      })}
    </div>
  )
}
