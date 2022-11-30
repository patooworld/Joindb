import 'package:flutter/material.dart';
import 'package:flutter_todo/components/todo_item.dart';
import 'package:flutter_todo/realm/schemas.dart';
import 'package:provider/provider.dart';
import 'package:flutter_todo/realm/realm_services.dart';
import 'package:realm/realm.dart';

class TodoList extends StatefulWidget {
  const TodoList({Key? key}) : super(key: key);

  @override
  State<TodoList> createState() => _TodoListState();
}

class _TodoListState extends State<TodoList> {
  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final realmServices = Provider.of<RealmServices>(context);
    return Stack(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.only(right: 15),
                child: Row(
                  mainAxisSize: MainAxisSize.max,
                  children: [
                    const Expanded(child: Text("Show All Tasks", textAlign: TextAlign.right)),
                    Switch(
                      value: realmServices.showAll,
                      onChanged: (value) async => await realmServices.switchSubscription(value),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: StreamBuilder<RealmResultsChanges<Item>>(
                  stream: realmServices.realm.all<Item>().changes,
                  builder: (context, snapshot) {
                    final data = snapshot.data;

                    if (data == null) return waitingIndicator();

                    final results = data.results;
                    return ListView.builder(
                      shrinkWrap: true,
                      itemCount: results.realm.isClosed ? 0 : results.length,
                      itemBuilder: (context, index) => results[index].isValid ? TodoItem(results[index]) : Container(),
                    );
                  },
                ),
              ),
              const Text("Log in with the same account on another device or simulator to see your list sync in realm-time"),
            ],
          ),
        ),
        realmServices.isWaiting ? waitingIndicator() : Container(),
      ],
    );
  }

  Container waitingIndicator() {
    return Container(
      color: Colors.black.withOpacity(0.2),
      child: const Center(child: CircularProgressIndicator()),
    );
  }
}
