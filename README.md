# Workflow Composer

A visual interface for creating, managing, and executing agent-based workflows through an intuitive drag-and-drop interface, combined with a generative AI chat interface.

## Features

- **Visual Workflow Editor**: Drag-and-drop interface for creating complex agent workflows
- **AI-Powered Chat Interface**: Natural language workflow creation and assistance
- **Real-time Collaboration**: Live workflow editing and execution
- **Component Library**: Pre-built agent and tool components
- **Version Control**: Save, load, and manage workflow versions

## Tech Stack

- **Frontend**: Next.js 13+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **AI Integration**: OpenAI GPT-3.5/4
- **UI Components**: Custom components with Radix UI primitives
- **Workflow Visualization**: ReactFlow
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with your environment variables:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
workflow-composer/
├── app/
│   ├── api/                # API routes (serverless functions)
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── services/           # API service layer
│   ├── types/              # TypeScript type definitions
│   └── page.tsx            # Main application page
├── public/                 # Static assets
└── README.md
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key for AI chat functionality

## Deployment

This project is optimized for deployment on Vercel:

1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy!

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
