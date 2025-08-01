// server.js - Express 서버 메인 파일
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Express 앱 생성
const app = express();
const PORT = process.env.PORT || 5000;

// 🎯 미들웨어 설정
// 1. CORS 설정 (프론트엔드와 통신 허용)
app.use(cors({
    origin: 'http://localhost:5173', // Vite 개발 서버
    credentials: true
}));

// 2. JSON 파싱 미들웨어
app.use(express.json());

// 3. URL 인코딩 미들웨어
app.use(express.urlencoded({ extended: true }));

// 4. 요청 로깅 미들웨어 (직접 구현)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// 🎯 임시 데이터 (나중에 데이터베이스로 교체)
let todos = [
    {
        id: 1,
        text: "Node.js 배우기",
        completed: false,
        priority: "high",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 2,
        text: "Express 서버 만들기",
        completed: true,
        priority: "medium",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 3,
        text: "REST API 구현하기",
        completed: false,
        priority: "high",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

// ID 카운터 (간단한 ID 생성용)
let nextId = 4;

// 🎯 기본 라우트
app.get('/', (req, res) => {
    res.json({
        message: '🚀 할 일 관리 API 서버',
        version: '1.0.0',
        endpoints: {
            todos: '/api/todos',
            health: '/api/health'
        },
        documentation: 'https://github.com/yourusername/todo-backend'
    });
});

// 🎯 헬스 체크 라우트
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// 🎯 TODO API 라우트들

// 1. 모든 할 일 조회 (GET /api/todos)
app.get('/api/todos', (req, res) => {
    try {
        // 쿼리 파라미터로 필터링
        const { completed, priority, search } = req.query;
        let filteredTodos = [...todos];

        // 완료 상태 필터
        if (completed !== undefined) {
            const isCompleted = completed === 'true';
            filteredTodos = filteredTodos.filter(todo => todo.completed === isCompleted);
        }

        // 우선순위 필터
        if (priority && priority !== 'all') {
            filteredTodos = filteredTodos.filter(todo => todo.priority === priority);
        }

        // 검색 필터
        if (search) {
            filteredTodos = filteredTodos.filter(todo => 
                todo.text.toLowerCase().includes(search.toLowerCase())
            );
        }

        // 정렬 (우선순위 높은 순, 그 다음 최신순)
        filteredTodos.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.json({
            success: true,
            data: filteredTodos,
            count: filteredTodos.length,
            total: todos.length
        });
    } catch (error) {
        console.error('할 일 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '할 일을 조회하는 중 오류가 발생했습니다.'
        });
    }
});

// 2. 특정 할 일 조회 (GET /api/todos/:id)
app.get('/api/todos/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const todo = todos.find(t => t.id === id);

        if (!todo) {
            return res.status(404).json({
                success: false,
                message: '할 일을 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            data: todo
        });
    } catch (error) {
        console.error('할 일 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '할 일을 조회하는 중 오류가 발생했습니다.'
        });
    }
});

// 3. 새 할 일 추가 (POST /api/todos)
app.post('/api/todos', (req, res) => {
    try {
        const { text, priority = 'medium' } = req.body;

        // 입력 검증
        if (!text || text.trim() === '') {
            return res.status(400).json({
                success: false,
                message: '할 일 내용을 입력해주세요.'
            });
        }

        if (text.length > 100) {
            return res.status(400).json({
                success: false,
                message: '할 일은 100자 이내로 입력해주세요.'
            });
        }

        if (!['low', 'medium', 'high'].includes(priority)) {
            return res.status(400).json({
                success: false,
                message: '우선순위는 low, medium, high 중 하나여야 합니다.'
            });
        }

        // 새 할 일 생성
        const newTodo = {
            id: nextId++,
            text: text.trim(),
            completed: false,
            priority,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        todos.push(newTodo);

        res.status(201).json({
            success: true,
            data: newTodo,
            message: '할 일이 성공적으로 추가되었습니다.'
        });
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        res.status(500).json({
            success: false,
            message: '할 일을 추가하는 중 오류가 발생했습니다.'
        });
    }
});

// 4. 할 일 수정 (PUT /api/todos/:id)
app.put('/api/todos/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { text, completed, priority } = req.body;
        
        const todoIndex = todos.findIndex(t => t.id === id);
        
        if (todoIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '할 일을 찾을 수 없습니다.'
            });
        }

        // 입력 검증
        if (text !== undefined) {
            if (text.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: '할 일 내용을 입력해주세요.'
                });
            }
            if (text.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: '할 일은 100자 이내로 입력해주세요.'
                });
            }
        }

        if (priority !== undefined && !['low', 'medium', 'high'].includes(priority)) {
            return res.status(400).json({
                success: false,
                message: '우선순위는 low, medium, high 중 하나여야 합니다.'
            });
        }

        // 할 일 업데이트
        const updatedTodo = {
            ...todos[todoIndex],
            ...(text !== undefined && { text: text.trim() }),
            ...(completed !== undefined && { completed }),
            ...(priority !== undefined && { priority }),
            updatedAt: new Date().toISOString()
        };

        todos[todoIndex] = updatedTodo;

        res.json({
            success: true,
            data: updatedTodo,
            message: '할 일이 성공적으로 수정되었습니다.'
        });
    } catch (error) {
        console.error('할 일 수정 오류:', error);
        res.status(500).json({
            success: false,
            message: '할 일을 수정하는 중 오류가 발생했습니다.'
        });
    }
});

// 5. 할 일 삭제 (DELETE /api/todos/:id)
app.delete('/api/todos/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const todoIndex = todos.findIndex(t => t.id === id);

        if (todoIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '할 일을 찾을 수 없습니다.'
            });
        }

        const deletedTodo = todos.splice(todoIndex, 1)[0];

        res.json({
            success: true,
            data: deletedTodo,
            message: '할 일이 성공적으로 삭제되었습니다.'
        });
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '할 일을 삭제하는 중 오류가 발생했습니다.'
        });
    }
});

// 6. 모든 할 일 삭제 (DELETE /api/todos)
app.delete('/api/todos', (req, res) => {
    try {
        const { completed } = req.query;
        
        if (completed !== undefined) {
            // 완료된 할 일만 삭제
            const isCompleted = completed === 'true';
            const deletedCount = todos.filter(todo => todo.completed === isCompleted).length;
            todos = todos.filter(todo => todo.completed !== isCompleted);
            
            res.json({
                success: true,
                message: `${deletedCount}개의 ${isCompleted ? '완료된' : '미완료'} 할 일이 삭제되었습니다.`,
                deletedCount
            });
        } else {
            // 모든 할 일 삭제
            const deletedCount = todos.length;
            todos = [];
            nextId = 1;
            
            res.json({
                success: true,
                message: `모든 할 일(${deletedCount}개)이 삭제되었습니다.`,
                deletedCount
            });
        }
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '할 일을 삭제하는 중 오류가 발생했습니다.'
        });
    }
});

// 🎯 통계 API
app.get('/api/todos/stats', (req, res) => {
    try {
        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        const active = total - completed;
        const byPriority = {
            high: todos.filter(t => t.priority === 'high').length,
            medium: todos.filter(t => t.priority === 'medium').length,
            low: todos.filter(t => t.priority === 'low').length
        };

        res.json({
            success: true,
            data: {
                total,
                completed,
                active,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
                byPriority
            }
        });
    } catch (error) {
        console.error('통계 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '통계를 조회하는 중 오류가 발생했습니다.'
        });
    }
});

// 🎯 404 에러 핸들러
app.use('/*error', (req, res) => {
    res.status(404).json({
        success: false,
        message: '요청하신 경로를 찾을 수 없습니다.',
        path: req.originalUrl
    });
});

// 🎯 전역 에러 핸들러
app.use((error, req, res, next) => {
    console.error('서버 오류:', error);
    res.status(500).json({
        success: false,
        message: '서버 내부 오류가 발생했습니다.',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
});

// 🎯 서버 시작
app.listen(PORT, () => {
    console.log(`
🚀 할 일 관리 API 서버가 시작되었습니다!
📍 서버 주소: http://localhost:${PORT}
📚 API 문서: http://localhost:${PORT}/
🔍 헬스 체크: http://localhost:${PORT}/api/health
📝 할 일 API: http://localhost:${PORT}/api/todos

환경: ${process.env.NODE_ENV || 'development'}
시간: ${new Date().toLocaleString('ko-KR')}
    `);
});

// 🎯 Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 서버를 종료합니다...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 서버를 종료합니다...');
    process.exit(0);
});