import { UploadCloud, BookOpen, Search } from 'lucide-react'

const features = [
  {
    title: 'Upload Documents',
    description: 'Easily upload your PDFs and textbooks. Your files are parsed and securely stored in the cloud.',
    icon: UploadCloud,
  },
  {
    title: 'Document Reader',
    description: 'Access and read your uploaded study materials from anywhere with our built-in document viewer.',
    icon: BookOpen,
  },
  {
    title: 'Intelligent Search',
    description: 'Instantly search across your uploaded documents to find the exact pages and information you need.',
    icon: Search,
  },
]

export function ModernFeaturesSection() {
  return (
    <section id="features" className="py-24 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Everything you need to master your studies</h2>
          <p className="text-muted-foreground text-lg">
            Studium provides a simple, powerful suite of tools to help you learn faster and remember more.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl bg-card border border-border flex flex-col items-center text-center hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
