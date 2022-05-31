import 'package:flutter/material.dart';
import '../components/todo_list.dart';
import '../components/create_todo.dart';
import '../components/app_bar.dart';

class HomePage extends StatelessWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: appBar,
      body: const TodoList(),
      floatingActionButton: const CreateTodo(),
    );
  }
}
